import { streamText } from 'ai'
import { z } from 'zod'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic, MODEL_ROUTES } from '@/lib/ai'
import { lessonSectionZ } from '@/lib/ai/schemas/lesson-section'
import {
  buildLessonChatSystemPrompt,
  LESSON_CHAT_PROMPT_VERSION,
} from '@/lib/ai/prompts/lesson-chat.v1'
import type { PersonaContext } from '@/lib/ai/prompts/chat-system.v1'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      messages: aiMessages,
      lessonId,
      workspaceId,
    } = body as {
      messages: {
        role: string
        content?: string
        parts?: { type: string; text?: string }[]
      }[]
      lessonId: string
      workspaceId: string
    }

    // Extract text from UIMessage (v6 uses parts, not content)
    function getMessageText(m: (typeof aiMessages)[number]): string {
      if (m.parts?.length) {
        return m.parts
          .filter((p) => p.type === 'text' && p.text)
          .map((p) => p.text)
          .join('')
      }
      return m.content ?? ''
    }

    const userMessages = (aiMessages ?? []).filter((m) => m.role === 'user')
    const lastUser = userMessages[userMessages.length - 1]
    const message = lastUser ? getMessageText(lastUser) : ''

    if (!lessonId || !workspaceId || !message?.trim()) {
      return NextResponse.json(
        { error: 'lessonId, workspaceId, and message are required' },
        { status: 400 },
      )
    }

    // Auth
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userRow } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', authUser.id)
      .single()
    if (!userRow) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify workspace ownership
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, name, settings')
      .eq('id', workspaceId)
      .eq('user_id', userRow.id)
      .single()
    if (!workspace) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Load lesson
    const { data: lesson } = await supabase
      .from('lessons')
      .select('id, title, structured_sections, workspace_id')
      .eq('id', lessonId)
      .eq('workspace_id', workspaceId)
      .single()
    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    // Lesson-scoped retrieval: lesson_concepts → chunk_concepts → chunks
    const { data: lessonConcepts } = await supabase
      .from('lesson_concepts')
      .select('concept_id')
      .eq('lesson_id', lessonId)

    const conceptIds = (lessonConcepts ?? []).map((lc) => lc.concept_id as string)

    let sourceChunks: { content: string; sectionHeading?: string }[] = []
    if (conceptIds.length > 0) {
      const { data: chunkConcepts } = await supabase
        .from('chunk_concepts')
        .select('chunk_id')
        .in('concept_id', conceptIds)

      const chunkIds = [...new Set((chunkConcepts ?? []).map((cc) => cc.chunk_id as string))]

      if (chunkIds.length > 0) {
        const { data: chunks } = await supabase
          .from('chunks')
          .select('content, enriched_content, section_heading, page_number, chunk_index')
          .in('id', chunkIds)
          .order('chunk_index', { ascending: true })
          .limit(20)

        sourceChunks = (chunks ?? []).map((c) => ({
          content: (c.enriched_content as string) || (c.content as string),
          ...(c.section_heading ? { sectionHeading: c.section_heading as string } : {}),
          ...(c.page_number ? { pageNumber: c.page_number as number } : {}),
        }))
      }
    }

    // Load persona
    const { data: personaData } = await supabase
      .from('personas')
      .select('interests, tone_preference, explanation_preferences')
      .eq('user_id', userRow.id)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    const persona: PersonaContext | undefined = personaData
      ? {
          ...(personaData.interests?.length
            ? { interests: personaData.interests as string[] }
            : {}),
          ...(personaData.tone_preference
            ? { tonePreference: personaData.tone_preference as string }
            : {}),
          ...((
            personaData.explanation_preferences as {
              depthPreference?: string
            }
          )?.depthPreference
            ? {
                depthPreference: (
                  personaData.explanation_preferences as {
                    depthPreference: string
                  }
                ).depthPreference,
              }
            : {}),
          ...((
            personaData.explanation_preferences as {
              explanationStyle?: string
            }
          )?.explanationStyle
            ? {
                explanationStyle: (
                  personaData.explanation_preferences as {
                    explanationStyle: string
                  }
                ).explanationStyle,
              }
            : {}),
        }
      : undefined

    // Domain instructions (from workspace settings if available)
    const settings = workspace.settings as { detectedDomain?: string } | null
    const domainSlug = settings?.detectedDomain

    // Build system prompt
    const systemContent = buildLessonChatSystemPrompt({
      lessonTitle: lesson.title as string,
      lessonSectionsJson: JSON.stringify(lesson.structured_sections ?? [], null, 2).slice(0, 8000),
      sourceChunks,
      persona,
      domainInstructions: domainSlug ? `Domain: ${domainSlug}` : undefined,
    })

    // Build messages
    const history = (aiMessages ?? []).slice(0, -1)
    type MessageRole = 'user' | 'assistant'
    const messages: { role: MessageRole; content: string }[] = [
      ...history
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          role: m.role as MessageRole,
          content: getMessageText(m),
        }))
        .filter((m) => m.content.length > 0),
      { role: 'user' as const, content: message },
    ]

    const startTime = Date.now()
    const modelId = MODEL_ROUTES.CHAT

    const result = streamText({
      model: anthropic(modelId as Parameters<typeof anthropic>[0]),
      system: systemContent,
      messages,
      tools: {
        renderSections: {
          description:
            'Render structured lesson sections (concept definitions, process flows, comparison tables, etc.) when a visual/structured explanation is better than plain text.',
          inputSchema: z.object({
            sections: z
              .array(lessonSectionZ)
              .describe(
                'Array of lesson sections to render. Each section has a type field and relevant content fields.',
              ),
          }),
        },
      },
      onFinish: async ({ text, usage }) => {
        const latencyMs = Date.now() - startTime

        // Track ai_request (Rule 6)
        await supabase.from('ai_requests').insert({
          user_id: userRow.id,
          workspace_id: workspaceId,
          model: modelId,
          provider: 'anthropic',
          prompt_tokens: usage.inputTokens ?? 0,
          completion_tokens: usage.outputTokens ?? 0,
          latency_ms: latencyMs,
          task_name: 'lesson-chat',
          prompt_version: LESSON_CHAT_PROMPT_VERSION,
          was_cached: false,
        })
      },
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('[lesson-chat/route] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

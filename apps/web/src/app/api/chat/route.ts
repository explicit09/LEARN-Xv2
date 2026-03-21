import { streamText, embed } from 'ai'
import { z } from 'zod'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic, openai, MODEL_ROUTES } from '@/lib/ai'
import { lessonSectionZ } from '@/lib/ai/schemas/lesson-section'
import {
  buildFullContextSystemBlocks,
  buildRagSystemBlocks,
  CHAT_PROMPT_VERSION,
  type PersonaContext,
} from '@/lib/ai/prompts/chat-system.v1'

const FULL_CONTEXT_TOKEN_THRESHOLD = 500_000

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // AI SDK useChat sends { messages: [{role, content},...], sessionId }
    // Extract the last user message as the current turn
    const { sessionId, messages: aiMessages } = body as {
      sessionId: string
      messages: {
        role: string
        content?: string
        parts?: { type: string; text?: string }[]
      }[]
    }

    // Extract text from v6 parts format or legacy content field
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
    const message =
      userMessages.length > 0 ? getMessageText(userMessages[userMessages.length - 1]!) : ''

    if (!sessionId || !message?.trim()) {
      return NextResponse.json({ error: 'sessionId and message are required' }, { status: 400 })
    }

    // Auth
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve user row
    const { data: userRow } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', authUser.id)
      .single()
    if (!userRow) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Load session + verify workspace ownership
    const { data: session } = await supabase
      .from('chat_sessions')
      .select('id, workspace_id')
      .eq('id', sessionId)
      .single()
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, name, total_token_count')
      .eq('id', session.workspace_id)
      .eq('user_id', userRow.id)
      .single()
    if (!workspace) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Use the history from AI SDK payload (excludes the current message, which is appended below)
    const history = (aiMessages ?? []).slice(0, -1)

    // Load persona (best-effort)
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
          ...((personaData.explanation_preferences as { depthPreference?: string })?.depthPreference
            ? {
                depthPreference: (
                  personaData.explanation_preferences as { depthPreference: string }
                ).depthPreference,
              }
            : {}),
          ...((personaData.explanation_preferences as { explanationStyle?: string })
            ?.explanationStyle
            ? {
                explanationStyle: (
                  personaData.explanation_preferences as { explanationStyle: string }
                ).explanationStyle,
              }
            : {}),
        }
      : undefined

    const isFullContext = (workspace.total_token_count ?? 0) < FULL_CONTEXT_TOKEN_THRESHOLD
    const startTime = Date.now()

    let modelId: string
    let systemContent: string
    let contextBlock: string | null = null
    let citedChunkIds: string[] = []

    if (isFullContext) {
      // Full-context mode: load chunk content
      modelId = MODEL_ROUTES.FULL_CONTEXT_CHAT

      const { data: chunkRows } = await supabase
        .from('chunks')
        .select('content, enriched_content')
        .eq('workspace_id', workspace.id)
        .order('chunk_index', { ascending: true })
        .limit(2000)

      const documentTexts = [
        {
          fileName: workspace.name as string,
          content: ((chunkRows ?? []) as { content: string; enriched_content: string | null }[])
            .map((c) => c.enriched_content || c.content)
            .join('\n\n'),
        },
      ]

      const { systemInstructions, documentCorpus } = buildFullContextSystemBlocks({
        workspaceName: workspace.name as string,
        documentTexts,
        ...(persona ? { persona } : {}),
      })
      systemContent = systemInstructions
      contextBlock = documentCorpus
    } else {
      // RAG mode: embed query → hybrid_search
      modelId = MODEL_ROUTES.CHAT

      const { embedding: queryEmbedding } = await embed({
        model: openai.textEmbeddingModel('text-embedding-3-large'),
        value: message,
      })

      const { data: searchResults } = await supabase.rpc('hybrid_search', {
        workspace_id_filter: workspace.id,
        query_embedding: JSON.stringify(queryEmbedding),
        query_text: message,
        match_count: 8,
        rrf_k: 60,
      })

      const retrieved = (searchResults ?? []) as {
        chunk_id: string
        content: string
        enriched_content: string | null
        page_number: number | null
        section_heading: string | null
      }[]
      citedChunkIds = retrieved.map((r) => r.chunk_id)

      const { systemInstructions, retrievedContext } = buildRagSystemBlocks({
        workspaceName: workspace.name as string,
        retrievedChunks: retrieved.map((r) => ({
          content: r.enriched_content || r.content,
          ...(r.section_heading ? { sectionHeading: r.section_heading } : {}),
          ...(r.page_number ? { pageNumber: r.page_number } : {}),
        })),
        ...(persona ? { persona } : {}),
      })
      systemContent = systemInstructions
      contextBlock = retrievedContext
    }

    // Persist user message
    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      role: 'user',
      content: message,
    })

    // Build messages array
    type MessageRole = 'user' | 'assistant'
    const messages: { role: MessageRole; content: string }[] = [
      // Context as prefilled exchange (cacheable by Anthropic)
      ...(contextBlock
        ? [
            { role: 'user' as const, content: contextBlock },
            { role: 'assistant' as const, content: 'I have the source material. How can I help?' },
          ]
        : []),
      ...history
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role as MessageRole, content: getMessageText(m) }))
        .filter((m) => m.content.length > 0),
      { role: 'user' as const, content: message },
    ]

    const result = streamText({
      model: anthropic(modelId as Parameters<typeof anthropic>[0]),
      system: systemContent,
      messages,
      tools: {
        renderSections: {
          description:
            'Render structured lesson sections (concept definitions, process flows, comparison tables, analogy cards, etc.) when a visual/structured explanation is better than plain text. Use for "explain differently", comparisons, step-by-step processes, or definitions.',
          inputSchema: z.object({
            sections: z
              .array(lessonSectionZ)
              .describe('Array of lesson sections to render visually.'),
          }),
        },
      },
      onFinish: async ({ text, usage }) => {
        const latencyMs = Date.now() - startTime

        // Persist assistant message
        const insertMsg: Record<string, unknown> = {
          session_id: sessionId,
          role: 'assistant',
          content: text,
          model_used: modelId,
          token_count: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
          latency_ms: latencyMs,
        }
        if (citedChunkIds.length > 0) insertMsg['cited_chunk_ids'] = citedChunkIds
        await supabase.from('chat_messages').insert(insertMsg)

        // Update session — set title from first message if not set yet
        const { data: currentSession } = await supabase
          .from('chat_sessions')
          .select('title')
          .eq('id', sessionId)
          .single()

        const updateData: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        }
        if (!currentSession?.title || currentSession.title === 'New conversation') {
          // Use first user message as title, truncated
          updateData.title = message.slice(0, 60) + (message.length > 60 ? '...' : '')
        }
        await supabase.from('chat_sessions').update(updateData).eq('id', sessionId)

        // Track ai_request (Rule 6 — every LLM call tracked)
        await supabase.from('ai_requests').insert({
          user_id: userRow.id,
          workspace_id: workspace.id,
          model: modelId,
          provider: 'anthropic',
          prompt_tokens: usage.inputTokens ?? 0,
          completion_tokens: usage.outputTokens ?? 0,
          latency_ms: latencyMs,
          task_name: 'chat',
          prompt_version: CHAT_PROMPT_VERSION,
          was_cached: false,
        })
      },
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('[chat/route] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

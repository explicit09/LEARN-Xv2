import type { PersonaContext } from './chat-system.v1'

export const LESSON_CHAT_PROMPT_VERSION = 'lesson-chat.v2'

export interface LessonChatPromptParams {
  lessonTitle: string
  lessonSectionsJson: string
  sourceChunks: { content: string; sectionHeading?: string; pageNumber?: number }[]
  persona?: PersonaContext | undefined
  domainInstructions?: string | undefined
}

/**
 * Build the SYSTEM prompt — lean tutor persona only.
 * Lesson data goes in a separate context message to leverage prompt caching
 * and prevent the LLM from over-using structured output for casual messages.
 */
export function buildLessonChatSystemPrompt(params: LessonChatPromptParams): string {
  const { lessonTitle, persona, domainInstructions } = params

  const personaSection = persona
    ? `
Adapt to this student's style:
${persona.tonePreference ? `- Tone: ${persona.tonePreference}` : ''}
${persona.depthPreference ? `- Depth: ${persona.depthPreference}` : ''}
${persona.explanationStyle ? `- Style: ${persona.explanationStyle}` : ''}
${persona.interests?.length ? `- Interests: ${persona.interests.join(', ')} (use for analogies when natural)` : ''}
`.trim()
    : ''

  return `You are a tutor helping a student reading "${lessonTitle}".

Respond naturally. Most answers should be plain text with markdown.
You have a renderSections tool — use it ONLY when a visual/structured layout genuinely helps (e.g. comparison tables, step-by-step processes, concept definitions the student asked to see differently).

For casual messages (thanks, ok, got it, greetings) — reply in 1 sentence. No tool calls.
For simple factual questions — reply in plain markdown. No tool calls.
For "explain differently" or "compare X and Y" — use the tool.

${domainInstructions ? `Domain: ${domainInstructions}` : ''}
${personaSection}

Ground answers in the lesson content provided. If asked about something not covered, say so.`.trim()
}

/**
 * Build the CONTEXT message — lesson data + source chunks.
 * This is sent as a separate user message before the conversation starts,
 * allowing Anthropic to cache it across turns.
 */
export function buildLessonContextMessage(params: LessonChatPromptParams): string {
  const { lessonTitle, lessonSectionsJson, sourceChunks } = params

  const chunksSection =
    sourceChunks.length > 0
      ? sourceChunks
          .map((c, i) => {
            const label = [
              `Source ${i + 1}`,
              c.sectionHeading ?? null,
              c.pageNumber ? `p.${c.pageNumber}` : null,
            ]
              .filter(Boolean)
              .join(' — ')
            return `[${label}]\n${c.content}`
          })
          .join('\n\n')
      : ''

  return `[LESSON CONTEXT — Reference material for answering questions. Do not repeat this back to the student.]

Lesson: ${lessonTitle}

Sections:
${lessonSectionsJson}

${chunksSection ? `Source Material:\n${chunksSection}` : '(No source chunks available)'}`.trim()
}

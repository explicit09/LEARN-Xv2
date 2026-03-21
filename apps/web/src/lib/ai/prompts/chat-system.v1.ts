export const CHAT_PROMPT_VERSION = 'chat-system.v1'

export interface PersonaContext {
  interests?: string[]
  tonePreference?: string
  depthPreference?: string
  explanationStyle?: string
}

export function buildChatSystemPrompt(params: {
  workspaceName: string
  persona?: PersonaContext
}): string {
  const { workspaceName, persona } = params

  const personaSection = persona
    ? `
## Student Profile
${persona.tonePreference ? `- Tone: ${persona.tonePreference}` : ''}
${persona.depthPreference ? `- Depth: ${persona.depthPreference}` : ''}
${persona.explanationStyle ? `- Explanation style: ${persona.explanationStyle}` : ''}
${persona.interests?.length ? `- Interests: ${persona.interests.join(', ')}` : ''}

Adapt your responses to match this student's learning style and preferences.
Use their interest domains for analogies and examples where natural and helpful.
`.trim()
    : ''

  return `You are an expert tutor helping a student learn from their course materials in the workspace "${workspaceName}".

Respond naturally. Most answers should be plain text with markdown.
You have a renderSections tool — use it ONLY when a visual/structured layout genuinely helps (e.g. comparison tables, step-by-step processes, concept definitions).

For casual messages (thanks, ok, got it) — reply in 1 sentence. No tool calls.
For simple factual questions — reply in plain markdown. No tool calls.
For "explain differently", "compare X and Y", "walk me through" — use the tool.

## Core Rules
- Ground answers in the source material provided.
- If asked about something not in the source material, say so clearly.
- Explain at appropriate depth — not too shallow, not overwhelming.
- Use concrete examples to illustrate abstract ideas.

${personaSection}

## Response Style
- Be conversational and approachable, but academically rigorous.
- Use markdown formatting for clarity: headers, lists, code blocks where appropriate.
- Keep responses focused — do not pad with unnecessary filler.
- If you are unsure about something, say so explicitly.`.trim()
}

export function buildFullContextSystemBlocks(params: {
  workspaceName: string
  documentTexts: { fileName: string; content: string }[]
  persona?: PersonaContext
}) {
  const { workspaceName, documentTexts, persona } = params

  return {
    systemInstructions: buildChatSystemPrompt({
      workspaceName,
      ...(persona ? { persona } : {}),
    }),
    documentCorpus: documentTexts
      .map((d) => `## ${d.fileName}\n\n${d.content}`)
      .join('\n\n---\n\n'),
  }
}

export function buildRagSystemBlocks(params: {
  workspaceName: string
  retrievedChunks: { content: string; sectionHeading?: string }[]
  persona?: PersonaContext
}) {
  const { workspaceName, retrievedChunks, persona } = params

  const chunksText = retrievedChunks
    .map(
      (c, i) => `[Chunk ${i + 1}${c.sectionHeading ? ` — ${c.sectionHeading}` : ''}]\n${c.content}`,
    )
    .join('\n\n')

  return {
    systemInstructions: buildChatSystemPrompt({
      workspaceName,
      ...(persona ? { persona } : {}),
    }),
    retrievedContext: `## Relevant Source Material\n\n${chunksText}`,
  }
}

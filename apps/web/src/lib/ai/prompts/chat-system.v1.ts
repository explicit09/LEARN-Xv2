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

## Core Rules
- Answer questions grounded in the source material provided. Cite specific sections when relevant.
- If asked about something not covered in the source material, say so clearly rather than inventing facts.
- Explain concepts at the appropriate depth — neither too shallow nor overwhelming.
- Use concrete examples to illustrate abstract ideas.
- When a student seems confused, break the concept down differently rather than repeating the same explanation.
- Encourage curiosity and deeper understanding, not just memorization.

## Citation Format
When referencing specific content from the source material, indicate it with [Source: <section name>].
This helps the student find the relevant material for deeper study.

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

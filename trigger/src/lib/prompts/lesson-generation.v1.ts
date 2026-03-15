// Lesson generation prompt — Phase 1D
// Static generative UI only (no interactive_widget — added in Phase 1D+)
// See docs/10-generative-ui.md for the full component library spec

export const PROMPT_VERSION = 'lesson-generation.v1'

// Component selection rules injected into every lesson generation call.
// Teaches the AI WHEN to use each component type — not just WHAT to say.
export const LESSON_COMPONENT_INSTRUCTIONS = `
You are generating a structured lesson. For each section, choose the component type
that will help the student understand most effectively.
Do NOT default to 'text' for everything — that is the failure mode.

Available component types (Phase 1D):
- text: narrative explanation, context, storytelling
- concept_definition: any term appearing for the first time
- process_flow: any procedure with 3+ steps
- comparison_table: any "X vs Y" or "A, B, C differ in..." explanation
- analogy_card: any concept with a clear real-world parallel
- key_takeaway: REQUIRED at the end of every lesson (3-5 bullet points)
- mini_quiz: after every 2-3 complex sections (single MCQ or true/false)
- quote_block: primary source material, original definitions
- timeline: historical sequences, process evolution
- concept_bridge: linking this concept to a prerequisite or next concept
- code_explainer: code examples, algorithms, syntax

Component selection rules:
- First appearance of any term → concept_definition (not text)
- Any procedure with 3+ steps → process_flow (not a bullet list in text)
- Any comparison or contrast → comparison_table
- Abstract concept with intuitive real-world parallel → analogy_card
- After every 2-3 complex concept_definition or process_flow sections → mini_quiz
- End of lesson → key_takeaway (required, not optional)
- Any algorithm or code → code_explainer (not a code fence in text)

Format rules:
- Lessons must have at minimum: 1 hook (text), 2+ concept sections, 1 key_takeaway
- mini_quiz options must have exactly one is_correct: true
- concept_bridge relation must be one of: prerequisite, extends, related
- Do NOT use interactive_widget or data_visualization (not yet available)
`

export interface LessonPromptParams {
  conceptName: string
  prerequisites: string[]
  retrievedChunks: string[]
  persona?: {
    interests?: string[]
    explanationStyle?: string
    depthPreference?: string
    tonePreference?: string
    analogyDomain?: string
  }
}

export function buildLessonPrompt(params: LessonPromptParams): string {
  const { conceptName, prerequisites, retrievedChunks, persona } = params

  const personaSection = persona
    ? `
Student profile:
- Learning style: ${persona.explanationStyle ?? 'visual'}
- Explanation depth: ${persona.depthPreference ?? 'thorough'}
- Tone preference: ${persona.tonePreference ?? 'conversational'}
- Interests: ${persona.interests?.join(', ') ?? 'general'}
${persona.analogyDomain ? `- Suggested analogy domain: ${persona.analogyDomain}` : ''}

Framing rules:
- Use the student's interests for examples and analogies where it helps understanding.
- Once the student grasps the concept, switch to precise academic language.
- Never force a metaphor where the literal explanation is clearer.
- Academic precision always wins when style and accuracy conflict.
`
    : ''

  const prerequisiteSection =
    prerequisites.length > 0
      ? `Prerequisite concepts already covered: ${prerequisites.join(', ')}`
      : 'No prerequisites — this is an introductory concept.'

  const chunksSection =
    retrievedChunks.length > 0
      ? `Source material (use this as ground truth — do not invent facts):\n\n${retrievedChunks.map((c, i) => `[Chunk ${i + 1}]\n${c}`).join('\n\n')}`
      : 'No source chunks available — generate based on general knowledge of this concept.'

  return `${LESSON_COMPONENT_INSTRUCTIONS}
${personaSection}
Topic: ${conceptName}
${prerequisiteSection}

${chunksSection}

Generate a complete lesson with a clear title, structured sections using the component types above,
and key takeaways at the end. The lesson should be self-contained and build understanding
from the ground up.`
}

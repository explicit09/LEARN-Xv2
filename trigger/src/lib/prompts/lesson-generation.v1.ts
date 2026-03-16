// Lesson generation prompt — Phase 1D
// Static generative UI only (no interactive_widget — added in Phase 1D+)
// See docs/10-generative-ui.md for the full component library spec

export const PROMPT_VERSION = 'lesson-generation.v2'

// Component selection rules injected into every lesson generation call.
export const LESSON_COMPONENT_INSTRUCTIONS = `
You are generating a structured lesson. For each section, choose the component type
that will help the student understand most effectively.
Do NOT default to 'text' for everything — that is the failure mode.

Available component types:
- text: narrative explanation, context, storytelling. Use for hooks and transitions.
- concept_definition: any term appearing for the first time. Include analogy field when helpful.
- process_flow: any procedure with 3+ steps.
- comparison_table: any "X vs Y" or "A, B, C differ in..." explanation. Make tables scannable.
- analogy_card: any abstract concept with a real-world parallel. Use the student's interests as the analogy domain when possible. The mapping array must explicitly link abstract→familiar with at least 2 pairs.
- key_takeaway: REQUIRED at the end of every lesson (3-5 bullet points). This is the most important section — it's what the student remembers.
- mini_quiz: after every 2-3 complex sections (single MCQ with 4 options).
- quote_block: primary source material, original definitions, notable quotes.
- timeline: historical sequences, process evolution, discovery chronology.
- concept_bridge: linking this concept to a prerequisite or next concept. Use at end of lesson to show where this fits in the learning path.
- code_explainer: code examples, algorithms, syntax.

Component selection rules:
- First appearance of any term → concept_definition (not text)
- Any procedure with 3+ steps → process_flow (not a bullet list in text)
- Any comparison or contrast → comparison_table
- Abstract concept with intuitive real-world parallel → analogy_card
- After every 2-3 complex concept_definition or process_flow sections → mini_quiz
- End of lesson → key_takeaway (required, not optional)
- Any algorithm or code → code_explainer (not a code fence in text)

Lesson structure (follow this order):
1. Hook (text) — an engaging, relatable opening that makes the student care
2. Core concepts (concept_definition, analogy_card, text) — build understanding layer by layer
3. Application (process_flow, comparison_table, code_explainer) — show how to use the knowledge
4. Check understanding (mini_quiz) — active recall checkpoint
5. Context (timeline, quote_block, text) — where this fits in the bigger picture
6. Connection (concept_bridge) — link to what comes next
7. Summary (key_takeaway) — the 3-5 things to remember

Format rules:
- mini_quiz options must have exactly one is_correct: true
- concept_bridge relation must be one of: prerequisite, extends, related
- Do NOT use interactive_widget or data_visualization (not yet available)
- Avoid back-to-back concept_definitions — insert a text bridge or analogy between them
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
    motivationalStyle?: string
    difficultyPreference?: string
    analogyDomain?: string | null
    framingStrength?: 'light' | 'moderate' | 'none'
  }
}

export function buildLessonPrompt(params: LessonPromptParams): string {
  const { conceptName, prerequisites, retrievedChunks, persona } = params
  const strength = persona?.framingStrength ?? 'moderate'

  const personaSection = persona
    ? `
Student profile:
- Learning style: ${persona.explanationStyle ?? 'visual'}
- Explanation depth: ${persona.depthPreference ?? 'thorough'}
- Tone preference: ${persona.tonePreference ?? 'conversational'}
- Motivation: ${persona.motivationalStyle ?? 'curiosity'}
- Level: ${persona.difficultyPreference ?? 'intermediate'}
- Interests: ${persona.interests?.join(', ') ?? 'general'}

Interest-based framing:
${persona.analogyDomain ? `- Best-match analogy domain for this concept: ${persona.analogyDomain}` : '- No specific domain match — use any clear real-world parallel'}
- Framing strength: ${strength}
  ${strength === 'light' ? '→ Use ONE interest-based analogy in the hook only. Rest is academic.' : ''}
  ${strength === 'moderate' ? '→ Use the interest domain for the analogy_card and 1-2 examples. Then switch to academic language.' : ''}
  ${strength === 'none' ? '→ Do NOT use interest-based analogies. Use generic real-world parallels only.' : ''}

Framing rules:
- Analogies should feel NATURAL — as if the student's interest organically illustrates the concept.
- Bad: "Since you like basketball, think of X as Y." (forced, breaks immersion)
- Good: "When a point guard drives to the basket, the defense collapses inward — that compression is exactly what happens to gas molecules..." (natural, the analogy IS the explanation)
- If no analogy domain fits naturally, use a universal real-world scenario instead.
- Once the concept clicks, shift to precise academic language immediately.
- Academic precision ALWAYS wins when it conflicts with framing.
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

Generate a complete lesson following the structure above. The lesson should feel like
a skilled tutor explaining the concept — engaging, clear, and building understanding
from the ground up. End with key_takeaway (required).`
}

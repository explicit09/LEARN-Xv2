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
- interactive_widget: a LIVE interactive HTML/CSS/JS widget embedded in the lesson. The student can manipulate sliders, click buttons, see graphs move, explore visually. Use this for any concept where playing with variables builds understanding faster than reading. The "html" field contains the full HTML/CSS/JS code that renders inside a sandboxed iframe.

Component selection rules:
- First appearance of any term → concept_definition (not text)
- Any procedure with 3+ steps → process_flow (not a bullet list in text)
- Any comparison or contrast → comparison_table
- Abstract concept with intuitive real-world parallel → analogy_card
- After every 2-3 complex concept_definition or process_flow sections → mini_quiz
- End of lesson → key_takeaway (required, not optional)
- Any algorithm or code → code_explainer (not a code fence in text)
- Any concept with variable relationships (math, science, finance, statistics) → interactive_widget
- Any concept where "what happens if I change X?" is the key insight → interactive_widget
- Career paths, decision trees, branching outcomes → interactive_widget

interactive_widget rules:
- The "html" field must be a COMPLETE, self-contained HTML snippet (no external dependencies).
- Use inline CSS and vanilla JavaScript only. No frameworks, no CDN links.
- Use Canvas API for charts/graphs. Use DOM manipulation for sliders and controls.
- Keep it focused: ONE interactive idea per widget. Don't try to build a full app.
- The widget must work immediately — no loading, no setup.
- Use the base styles provided by the container (font-family, button, input[type=range], .label, .value classes are available).
- Maximum ~150 lines of HTML/CSS/JS combined. Keep it lean.
- Include at least one interactive control (slider, button, or clickable element).
- Show the result of interaction visually (a number updating, a graph redrawing, a path highlighting).
- Example use cases:
  - Compound interest: sliders for rate, time, principal → live graph
  - Gas laws: slider for pressure → volume changes inversely (animated)
  - Supply/demand: drag supply or demand curve → equilibrium moves
  - Career paths: click a field → branching diagram shows options
  - Sorting algorithms: click "step" → see the array rearrange

Lesson structure (follow this order):
1. Hook (text) — an engaging, relatable opening that makes the student care
2. Core concepts (concept_definition, analogy_card, text) — build understanding layer by layer
3. Explore (interactive_widget) — let the student PLAY with the concept, if applicable
4. Application (process_flow, comparison_table, code_explainer) — show how to use the knowledge
5. Check understanding (mini_quiz) — active recall checkpoint
6. Context (timeline, quote_block, text) — where this fits in the bigger picture
7. Connection (concept_bridge) — link to what comes next
8. Summary (key_takeaway) — the 3-5 things to remember

Format rules:
- mini_quiz options must have exactly one is_correct: true
- concept_bridge relation must be one of: prerequisite, extends, related
- Avoid back-to-back concept_definitions — insert a text bridge or analogy between them
- Use at most 1-2 interactive_widgets per lesson (they're powerful but heavy)
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

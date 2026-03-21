// Lesson generation prompt — v3 (syllabus-aware, position context, extended metaphor)
// See docs/10-generative-ui.md for the full component library spec

export const PROMPT_VERSION = 'lesson-generation.v3'

// Component selection rules injected into every lesson generation call.
export const LESSON_COMPONENT_INSTRUCTIONS = `
You are generating a structured lesson. The lesson should read like an engaging essay
with occasional interactive "stops" — not a wall of disconnected component blocks.

TARGET LENGTH: 1,200-1,800 words total across all text sections combined. A student should finish in under 10 minutes feeling like they actually get it. Focused depth, not exhaustive coverage.

ZERO ASSUMED KNOWLEDGE: Define every technical term in plain English the first time you use it. Never drop jargon without an immediate plain-language explanation. A student reading this may have NO prior background — build from scratch.

TEXT SECTIONS ARE THE BACKBONE. They carry the narrative, explanation, transitions, and hooks.
A good lesson is ~60% prose (text), ~20% structured components, ~20% quiz/takeaway.
Write like a brilliant friend who happens to know this topic deeply and explains it over coffee — clear, human, no lecture voice.

Text sections can contain full markdown formatting:
- **bold** for key terms (define most terms inline this way — only use concept_definition for the 1-2 most important new terms)
- *italics* for emphasis
- $$LaTeX$$ for math formulas (inline $x^2$ or display $$\\sum_{i=1}^{n} x_i$$)
- \`\`\`code\`\`\` for code fences
- > blockquotes for notable statements
- - bullet lists and 1. numbered lists
- [links](url) for references
- Tables in GFM format when comparing 2-3 simple items inline

TOPIC TYPE ROUTING — match content to subject:

FOR QUANTITATIVE TOPICS (Math, Physics, Chemistry, Finance, Statistics, Engineering):
- Include 2-3 key formulas using $$formula$$ notation
- Add ONE detailed worked example showing all calculation steps with actual numbers
- Show the formula BEFORE the worked example
- Provide a final numerical answer with practical interpretation

FOR TECHNICAL TOPICS (Programming, Digital circuits, Hardware, Software):
- Include actual code examples with proper syntax highlighting
- Show truth tables, state diagrams, or flowcharts using markdown tables
- Provide technical specifications (timing, constraints, parameters)
- Don't replace technical content with analogies — use analogies to ENHANCE understanding

FOR CONCEPTUAL/QUALITATIVE TOPICS (Policies, Writing, Social sciences, Study strategies):
- Skip formulas and worked examples
- Use concrete scenarios and case studies instead
- Focus on practical application and real-world situations

Available component types:
- text: narrative explanation, context, storytelling, hooks, transitions. This is the PRIMARY section type. Use for 2-3 paragraphs of rich markdown prose.
- concept_definition: ONLY for the 1-2 most important new terms in the lesson. Include analogy field when helpful. Define other terms inline with **bold** in text sections.
- process_flow: any procedure with 3+ steps where visual step-by-step layout genuinely helps.
- comparison_table: any "X vs Y" or multi-column comparison where a structured table is clearer than prose.
- analogy_card: any abstract concept with a real-world parallel. Use the student's interests as the analogy domain when possible. The mapping array must explicitly link abstract→familiar with at least 2 pairs.
- key_takeaway: REQUIRED at the end of every lesson (3-5 bullet points). This is the most important section — it's what the student remembers.
- mini_quiz: after every 3+ paragraphs of explanation (single MCQ with 4 options). Active recall checkpoint.
- quote_block: primary source material, original definitions, notable quotes.
- timeline: historical sequences, process evolution, discovery chronology.
- concept_bridge: linking this concept to a prerequisite or next concept. Use at end of lesson.
- code_explainer: code examples, algorithms, syntax. ONLY use when the concept actually involves programming or computation. Do NOT add Python/R code to non-CS subjects unless the source material does.
- interactive_widget: a LIVE interactive HTML/CSS/JS widget. Use ONLY when the concept has variable relationships where "what happens if I change X?" is the core insight. Maximum 1 per lesson. Most lessons should have 0 interactive widgets.

Lesson rhythm (the "readable backbone" pattern):
1. Opening (text — 2-3 paragraphs). Structure: Definition + Payoff first, THEN metaphor.
   - First 1-2 sentences: What is it and why does it matter? (the formal concept, plainly stated)
   - Then: the metaphor lens to understand it through
   - NEVER start with "Imagine..." or "Picture yourself..." — these are overused and predictable.
   - Rotate opening styles across lessons:
     • Definition + payoff + metaphor (default)
     • Surprising fact or counterintuitive claim
     • Question that exposes a gap: "Why does X happen but not Y?"
     • Real-world consequence that demands understanding (something that actually happened)
     • Bold claim you'll prove by lesson's end
2. First concept explanation (text — inline **bold** terms, LaTeX $$formulas$$, > blockquotes)
3. Optional: concept_definition ONLY for the single most important new term
4. For quantitative topics: worked example with actual numbers
5. One structured component where it genuinely helps (analogy_card OR process_flow OR comparison_table — pick ONE, the best fit)
6. Quick check (mini_quiz — after 3+ paragraphs of explanation)
7. Deeper exploration (text — connect to prerequisites, real-world applications)
8. Optional: second structured component only if genuinely needed
9. Connection (concept_bridge — link to next topic)
10. Summary (key_takeaway — required, max 5 bullets, keep each bullet under 25 words)

Rules:
- Maximum 3-4 structured components per lesson (concept_definition, analogy_card, process_flow, comparison_table, interactive_widget combined)
- mini_quiz and key_takeaway don't count toward this limit
- text sections should be 2-3 paragraphs each, not single sentences
- Maximum ~20 bold terms per lesson — define the most important ones, not every noun
- Use markdown formatting INSIDE text sections: **bold** for key terms, *italics* for emphasis, $$latex$$ for math, \`\`\`code\`\`\` for code, > for quotes, - for lists
- Do NOT use concept_definition for every new term — only the 1-2 most important ones. Define other terms inline with **bold** in text sections.
- Do NOT default to structured components when prose would explain it just as well

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

Format rules:
- mini_quiz options must have exactly one is_correct: true
- concept_bridge relation must be one of: prerequisite, extends, related
- Avoid back-to-back concept_definitions — insert a text bridge or analogy between them
`

export interface LessonPromptParams {
  // Topic-level (Phase 3)
  topicTitle: string
  conceptNames: string[]
  learningObjectives: string[]
  continuityNotes?: string | undefined
  positionCurrent: number
  positionTotal: number
  nextTopicTitle?: string | undefined
  previousTopicTitle?: string | undefined
  // Content
  prerequisites: string[]
  retrievedChunks: string[]
  domainInstructions?: string | undefined
  // Personalization
  persona?:
    | {
        interests?: string[] | undefined
        explanationStyle?: string | undefined
        depthPreference?: string | undefined
        tonePreference?: string | undefined
        motivationalStyle?: string | undefined
        difficultyPreference?: string | undefined
        analogyDomain?: string | null | undefined
        framingStrength?: 'light' | 'moderate' | 'none' | undefined
      }
    | undefined
  // Spaced retrieval (Phase 4c)
  spacedRetrievalItems?: string[] | undefined
}

export function buildLessonPrompt(params: LessonPromptParams): string {
  const {
    topicTitle,
    conceptNames,
    learningObjectives,
    continuityNotes,
    positionCurrent,
    positionTotal,
    nextTopicTitle,
    previousTopicTitle,
    prerequisites,
    retrievedChunks,
    persona,
    domainInstructions,
    spacedRetrievalItems,
  } = params
  const strength = persona?.framingStrength ?? 'moderate'

  // ── Position context (Phase 3b) ───────────────────────────
  const positionSection = `
LESSON POSITION: Lesson ${positionCurrent} of ${positionTotal}
${previousTopicTitle ? `PREVIOUS LESSON: ${previousTopicTitle}` : 'This is the FIRST lesson.'}
${nextTopicTitle ? `NEXT LESSON: ${nextTopicTitle}` : 'This is the LAST lesson.'}

LEARNING OBJECTIVES:
${learningObjectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}

CONCEPTS TO COVER: ${conceptNames.join(', ')}
${continuityNotes ? `\nCONTINUITY: ${continuityNotes}` : ''}
`

  // ── Extended metaphor (Phase 4b) ──────────────────────────
  const extendedMetaphorSection = persona?.analogyDomain
    ? `
EXTENDED METAPHOR: Build ONE sustained metaphor from ${persona.analogyDomain}.
- Introduce in the hook
- Use in analogy_card mappings
- Reference in mini_quiz framing
- Connect to concept_bridge
Do NOT switch metaphors. One deep metaphor > 4 shallow mentions.
`
    : ''

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
${extendedMetaphorSection}
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
      : 'No prerequisites — this is an introductory topic.'

  const chunksSection =
    retrievedChunks.length > 0
      ? `Source material (cite with [1], [2] etc. when using facts from these sources — do not invent facts):

${retrievedChunks.map((c, i) => `[${i + 1}]\n${c}`).join('\n\n')}

Citation rules:
- When stating a fact, definition, or formula from source material, add the source number: [1], [2]
- Place citations at the END of the sentence, before the period: "Energy is quantized [1]."
- Do NOT cite your own analogies, hooks, or explanations — only source-derived facts
- A sentence can have multiple citations: "Proposed by Planck [1] and confirmed by Einstein [2]."
- Uncited explanatory text is fine — not every sentence needs a citation`
      : 'No source chunks available — generate based on general knowledge of these concepts.'

  const domainSection = domainInstructions ? `\n${domainInstructions}\n` : ''

  // ── Spaced retrieval (Phase 4c) ───────────────────────────
  const spacedSection =
    spacedRetrievalItems && spacedRetrievalItems.length > 0
      ? `
SPACED RETRIEVAL — Quick recall from earlier lessons:
${spacedRetrievalItems.map((item) => `- ${item}`).join('\n')}
Weave 1-2 of these into your hook or first mini_quiz as "recall from last time" questions.
This activates prior knowledge and strengthens long-term retention.
`
      : ''

  return `${LESSON_COMPONENT_INSTRUCTIONS}
${domainSection}${personaSection}${positionSection}${spacedSection}
Topic: ${topicTitle}
${prerequisiteSection}

${chunksSection}

Generate a complete lesson following the structure above. The lesson should feel like
a skilled tutor explaining the concept — engaging, clear, and building understanding
from the ground up. End with key_takeaway (required).

IMPORTANT: Every section object must include ALL schema fields. Use empty string "" for unused string fields, empty array [] for unused array fields. The from/to fields for concept_bridge are named from_concept and to_concept.`
}

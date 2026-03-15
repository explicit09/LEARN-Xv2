# Generative UI

## The Core Idea

Most AI study tools generate a wall of markdown. A lesson on "Newton's Second Law" from NotebookLM or any competitor looks like: heading, paragraph, heading, paragraph, bullet list. Static. Flat. Forgettable.

LEARN-X lessons are different because **the AI decides how to teach each section, not just what to say**. A lesson on Newton's Second Law becomes:

1. A hook paragraph (text)
2. Three definition cards: Force, Mass, Acceleration
3. An interactive diagram — drag the mass and force sliders, see acceleration change in real time
4. A step-by-step process flow for solving F=ma problems
5. A comparison table — heavy vs. light object, same force
6. An inline mini-quiz — one question to check understanding before moving on
7. A key takeaways block

This is the structural principle behind LEARN-X lessons. The AI is not a markdown generator. The AI is a **teaching designer** that chooses the richest component for each idea.

---

## Two Modes of Generative UI

### Mode 1: Static Generative UI (lesson creation time)

When Trigger.dev generates a lesson, the AI outputs a structured component spec — not markdown. Each section is a named component with a type, content, and props. This spec is stored in `structured_sections` and rendered by the frontend's component router.

This is *declarative generative UI*: the AI returns a UI specification; the frontend renders it using LEARN-X's own design system.

```
Trigger.dev lesson job
  → generateObject() with component schema
  → AI decides: this concept needs a diagram, that step needs a process flow
  → Stores [{ type: 'interactive_diagram', ... }, { type: 'process_flow', ... }]
  → Frontend LessonRenderer routes each section to the right React component
```

### Mode 2: Dynamic Generative UI (real-time in chat)

During a lesson chat or workspace chat, the AI can stream a live widget when a visual explanation is better than text. A student asks "show me how a B-tree insertion works" — instead of an ASCII diagram, the AI calls a `renderWidget` tool and streams functional HTML/SVG/JS that renders in a sandboxed iframe.

This follows the exact pattern Claude.ai uses for interactive charts. The AI calls a tool, the HTML streams token-by-token, the client does incremental DOM injection, the widget is live.

```
Student: "show me how a binary search works step by step"
  → AI calls renderWidget({ title, widget_code: '<html>..interactive animation..' })
  → Streams HTML tokens into sandboxed iframe
  → Student sees a live, interactive binary search visualization
  → Can click "next step", drag elements, etc.
```

---

## Mode 1: Component Library (Lesson Sections)

These are the component types the AI can choose when generating a lesson. The lesson generation prompt teaches the AI when to use each one.

| Type | When to use | What it renders |
|------|------------|----------------|
| `text` | Narrative explanation, context, storytelling | Clean readable prose |
| `concept_definition` | Key term that must be precisely understood | Card: term + definition + optional etymology/analogy |
| `process_flow` | Any step-by-step procedure or algorithm | Numbered steps with connecting arrows |
| `comparison_table` | Comparing two or more options/approaches/concepts | Side-by-side comparison with highlighted differences |
| `interactive_widget` | Any concept that changes visually with parameters | Sandboxed HTML/SVG/JS widget (see Mode 2 for how this is generated) |
| `data_visualization` | Quantitative relationships, trends, distributions | Chart.js bar/line/scatter rendered in widget |
| `code_explainer` | Code examples, algorithms, syntax | Syntax-highlighted code with line annotations |
| `analogy_card` | Abstract concept that maps to a familiar real-world thing | Split card: abstract concept ↔ familiar analogy |
| `key_takeaway` | The 1–3 things a student must remember from this section | Highlighted block with numbered points |
| `mini_quiz` | After a complex explanation, check understanding before continuing | Single MCQ or true/false, inline, non-blocking |
| `quote_block` | Primary source material, original definition | Styled quotation with attribution |
| `timeline` | Historical sequence, process evolution | Horizontal/vertical timeline with dates |
| `concept_bridge` | Linking current concept to a prerequisite or next concept | Connector card showing the relationship |

### Component spec schema

```typescript
// Updates the structured_sections field in the lessons table
type LessonSection =
  | { type: 'text'; content: string }
  | { type: 'concept_definition'; term: string; definition: string; analogy?: string; etymology?: string }
  | { type: 'process_flow'; title: string; steps: { label: string; description: string }[] }
  | { type: 'comparison_table'; title: string; columns: string[]; rows: { label: string; values: string[] }[] }
  | { type: 'interactive_widget'; title: string; widget_html: string; description: string }
  | { type: 'data_visualization'; title: string; chart_type: 'bar' | 'line' | 'scatter' | 'pie'; widget_html: string }
  | { type: 'code_explainer'; language: string; code: string; annotations: { line: number; note: string }[] }
  | { type: 'analogy_card'; concept: string; analogy: string; mapping: { abstract: string; familiar: string }[] }
  | { type: 'key_takeaway'; points: string[] }
  | { type: 'mini_quiz'; question: string; options: { label: string; text: string; is_correct: boolean }[]; explanation: string }
  | { type: 'quote_block'; quote: string; attribution: string }
  | { type: 'timeline'; title: string; events: { date: string; label: string; description: string }[] }
  | { type: 'concept_bridge'; from: string; to: string; relation: 'prerequisite' | 'extends' | 'related'; explanation: string }
```

---

## Mode 1: Lesson Generation Prompt

The lesson generation prompt must teach the AI *when* to choose each component. The AI should not default to `text` for everything — that's the failure mode.

```typescript
const LESSON_COMPONENT_INSTRUCTIONS = `
You are generating a structured lesson. For each section, choose the component type
that will help the student understand most effectively. Do NOT default to 'text' for everything.

Component selection rules:
- Any term that appears for the first time → concept_definition
- Any procedure with 3+ steps → process_flow
- Any "X vs Y" or "A, B, and C differ in..." → comparison_table
- Any concept with a clear real-world parallel → analogy_card
- Any numerical relationship or formula with variables → interactive_widget (with sliders)
- Any data showing trends or proportions → data_visualization
- Any algorithm or syntax example → code_explainer
- After every 2-3 complex sections → mini_quiz
- End of every lesson → key_takeaway

For interactive_widget and data_visualization, generate the full HTML in widget_html.
The HTML will render in a sandboxed iframe. Requirements for widget_html:
- Pure HTML/CSS/JS — no framework, no build step
- No external CDNs except: cdn.jsdelivr.net, unpkg.com, cdn.plot.ly
- Use CSS variables: var(--color-primary), var(--color-surface), var(--color-text)
- No gradients, no box-shadow, no blur — these cause streaming artifacts
- Two font weights max (400 and 600)
- Sentence case only
- Style first, then content HTML, then <script> last (enables progressive rendering)
- Must work in dark mode via CSS variable overrides
`
```

### The generation call

```typescript
import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'

const { object: lesson } = await generateObject({
  model: openai('gpt-4o'),
  schema: z.object({
    title: z.string(),
    sections: z.array(lessonSectionSchema),  // discriminated union above
    summary: z.string(),
    key_takeaways: z.array(z.string()),
  }),
  system: LESSON_COMPONENT_INSTRUCTIONS,
  prompt: buildLessonPrompt({ concept, retrievedChunks, persona }),
})

// Record AI request (Rule 6)
await recordAIRequest({ taskType: 'lesson_gen', model: 'gpt-4o', ... })

// Store sections as structured_sections JSONB
await db.update(lessonsTable).set({
  structuredSections: lesson.sections,
  contentMarkdown: sectionsToMarkdown(lesson.sections),  // fallback for export
  ...
})
```

---

## Mode 1: Frontend — LessonRenderer

The frontend routes each section to the correct React component. This is the component router.

```tsx
// components/lesson/LessonRenderer.tsx
export function LessonRenderer({ sections }: { sections: LessonSection[] }) {
  return (
    <div className="lesson-body space-y-8">
      {sections.map((section, i) => (
        <LessonSection key={i} section={section} />
      ))}
    </div>
  )
}

function LessonSection({ section }: { section: LessonSection }) {
  switch (section.type) {
    case 'text':             return <TextSection {...section} />
    case 'concept_definition': return <ConceptDefinition {...section} />
    case 'process_flow':     return <ProcessFlow {...section} />
    case 'comparison_table': return <ComparisonTable {...section} />
    case 'interactive_widget': return <WidgetFrame html={section.widget_html} title={section.title} />
    case 'data_visualization': return <WidgetFrame html={section.widget_html} title={section.title} />
    case 'code_explainer':   return <CodeExplainer {...section} />
    case 'analogy_card':     return <AnalogyCard {...section} />
    case 'key_takeaway':     return <KeyTakeaway {...section} />
    case 'mini_quiz':        return <MiniQuiz {...section} />
    case 'quote_block':      return <QuoteBlock {...section} />
    case 'timeline':         return <Timeline {...section} />
    case 'concept_bridge':   return <ConceptBridge {...section} />
    default:                 return null
  }
}
```

### WidgetFrame — the sandboxed iframe renderer

```tsx
// components/lesson/WidgetFrame.tsx
// Renders interactive_widget and data_visualization content safely

const WIDGET_SANDBOX = [
  'allow-scripts',           // JS execution
  'allow-same-origin',       // CSS variable access from parent
].join(' ')

// CSS variables injected into every widget — widget code uses var(--color-primary) etc.
function buildWidgetHtml(widgetHtml: string, theme: 'light' | 'dark'): string {
  const vars = theme === 'dark' ? CSS_VARS_DARK : CSS_VARS_LIGHT
  return `
    <style>
      :root {
        --color-primary: ${vars.primary};
        --color-surface: ${vars.surface};
        --color-text: ${vars.text};
        --color-text-muted: ${vars.textMuted};
        --color-border: ${vars.border};
        --color-accent: ${vars.accent};
        --font-sans: 'Inter', system-ui, sans-serif;
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: var(--font-sans); color: var(--color-text); background: var(--color-surface); }
    </style>
    ${widgetHtml}
  `
}

export function WidgetFrame({ html, title }: { html: string; title: string }) {
  const { theme } = useTheme()
  const srcDoc = buildWidgetHtml(html, theme)

  return (
    <figure className="widget-frame">
      <figcaption className="text-sm text-muted-foreground mb-2">{title}</figcaption>
      <iframe
        srcDoc={srcDoc}
        sandbox={WIDGET_SANDBOX}
        className="w-full rounded-lg border border-border"
        style={{ minHeight: 280 }}
        onLoad={(e) => autoResizeIframe(e.currentTarget)}
        title={title}
      />
    </figure>
  )
}
```

---

## Mode 2: Dynamic Generative UI in Chat

During chat, the AI can call `renderWidget` to stream a live widget instead of a text description. This uses Vercel AI SDK's `streamUI` with a custom tool.

### The chat route with generative UI

```typescript
// app/api/chat/route.ts
import { streamUI } from 'ai/rsc'

export async function POST(req: Request) {
  const { sessionId, messages } = await req.json()
  // ... auth, retrieval ...

  const result = await streamUI({
    model: openai('gpt-4o'),
    system: buildSystemPrompt({ persona, retrievedChunks }),
    messages,

    // Default: render text as chat bubble
    text: ({ content, done }) => (
      <ChatBubble role="assistant" content={content} streaming={!done} />
    ),

    tools: {
      // AI calls this when a visual is better than text
      renderWidget: {
        description: 'Render an interactive visual — diagram, chart, simulation, or explainer. Use when a concept is better shown than described.',
        parameters: z.object({
          title: z.string().describe('Short descriptive title'),
          loading_message: z.string().describe('What to show while rendering (e.g. "Building diagram...")'),
          widget_html: z.string().describe('Complete HTML fragment for the widget. CSS vars only, no external deps except allowlisted CDNs.'),
        }),
        generate: async function* ({ title, loading_message, widget_html }) {
          // Immediately show loading state
          yield (
            <WidgetLoading message={loading_message} />
          )

          // Record AI request for observability
          await recordAIRequest({ taskType: 'chat_widget', ... })

          // Return final rendered widget
          return (
            <ChatWidgetFrame title={title} html={widget_html} />
          )
        },
      },

      // AI calls this to highlight a concept from the knowledge graph
      highlightConcept: {
        description: 'Highlight a concept from the workspace knowledge graph with its definition and mastery state.',
        parameters: z.object({
          conceptId: z.string().uuid(),
        }),
        generate: async function* ({ conceptId }) {
          yield <ConceptCardLoading />
          const concept = await db.query.concepts.findFirst({ where: eq(concepts.id, conceptId) })
          const mastery = await getMasteryForConcept(conceptId, userId)
          return <ConceptCard concept={concept} mastery={mastery} />
        },
      },

      // AI calls this to surface a relevant flashcard inline
      showFlashcard: {
        description: 'Show a flashcard for a specific concept inline in the chat.',
        parameters: z.object({
          conceptId: z.string().uuid(),
        }),
        generate: async function* ({ conceptId }) {
          yield <FlashcardLoading />
          const card = await getFlashcardForConcept(conceptId, userId)
          return <InlineFlashcard card={card} onRate={handleRate} />
        },
      },
    },
  })

  return result.toDataStreamResponse()
}
```

### The system prompt addition for generative chat

```typescript
const GENERATIVE_CHAT_INSTRUCTIONS = `
You can render interactive visuals using the renderWidget tool.

Use renderWidget when:
- The student asks to "show", "visualize", "draw", or "diagram" something
- An equation has multiple variables that benefit from interactive exploration
- A process has spatial or sequential structure that text can't capture well
- Data relationships are better shown as a chart than described

Do NOT use renderWidget for:
- Simple definitions or explanations
- Lists of facts
- Anything that plain text communicates clearly

When generating widget_html, follow these strict rules:
1. Pure HTML/CSS/JS — no React, no Vue, no build step
2. Only these CDNs: cdn.jsdelivr.net, unpkg.com
3. CSS variables for all colors: var(--color-primary), var(--color-surface), var(--color-text), var(--color-accent)
4. No box-shadow, no backdrop-filter, no gradients — they cause rendering artifacts
5. Font weights: 400 and 600 only
6. Order: <style> → HTML content → <script> — this enables progressive rendering
7. Make it interactive where natural: sliders, click-to-reveal, hover states
8. Dark mode works via CSS variable overrides — don't hardcode any colors
`
```

---

## Widget Design System

All generated widgets must use these CSS variables. The LEARN-X theme injects them into every iframe.

```typescript
// lib/ai/widget-design-system.ts

export const CSS_VARS_LIGHT = {
  primary:   '#1a1a1a',   // near-black, warm
  surface:   '#fafaf8',   // off-white, warm
  surfaceAlt:'#f2f1ee',   // slightly darker surface
  text:      '#1a1a1a',
  textMuted: '#6b6860',
  border:    '#e4e2dd',
  accent:    '#b5783a',   // warm amber — the one color moment
  success:   '#2d6a4f',
  warning:   '#c77c12',
  error:     '#b03a2e',
}

export const CSS_VARS_DARK = {
  primary:   '#f0ede8',
  surface:   '#141412',
  surfaceAlt:'#1e1d1a',
  text:      '#f0ede8',
  textMuted: '#8a8880',
  border:    '#2e2d2a',
  accent:    '#d4945a',
  success:   '#4a9970',
  warning:   '#e09030',
  error:     '#d45a50',
}

// Inject into every widget iframe
export const WIDGET_BASE_STYLES = `
  :root {
    --color-primary:    [injected];
    --color-surface:    [injected];
    --color-surface-alt:[injected];
    --color-text:       [injected];
    --color-text-muted: [injected];
    --color-border:     [injected];
    --color-accent:     [injected];
    --radius:           6px;
    --font-sans:        'Inter', system-ui, -apple-system, sans-serif;
  }
  *, *::before, *::after { box-sizing: border-box; }
  body {
    font-family: var(--font-sans);
    font-size: 14px;
    line-height: 1.5;
    color: var(--color-text);
    background: var(--color-surface);
    padding: 16px;
  }
  /* No gradients. No shadows. No blur. */
`

// Allowlisted CDNs for widget scripts
export const ALLOWED_CDNS = [
  'https://cdn.jsdelivr.net',
  'https://unpkg.com',
  'https://cdn.plot.ly',
]
```

---

## How This Changes the Lesson Prompt

The lesson generation prompt in `07-ai-pipeline.md` must be updated to output structured sections with component types. The key change: instead of returning a markdown string, the AI returns a JSON object where each section specifies a component type.

The AI prompt must include:
1. The component selection rules (when to use each type)
2. The widget HTML constraints (for `interactive_widget` and `data_visualization`)
3. Example of a well-structured lesson showing variety of component types

### Example: Newton's Second Law lesson output

```json
{
  "title": "Newton's Second Law: Force, Mass, and Acceleration",
  "sections": [
    {
      "type": "text",
      "content": "Here's the question that stumped physicists for centuries: why does a bowling ball and a tennis ball fall at the same rate, but a bowling ball is much harder to push? Newton's second law answers both."
    },
    {
      "type": "concept_definition",
      "term": "Net Force",
      "definition": "The vector sum of all forces acting on an object. When forces cancel out, net force is zero — the object doesn't accelerate.",
      "analogy": "Like a tug-of-war: it's not how hard each team pulls, it's the difference in total force that moves the rope."
    },
    {
      "type": "interactive_widget",
      "title": "F = ma explorer",
      "description": "Drag the sliders to see how force, mass, and acceleration relate",
      "widget_html": "<style>...</style><div class='widget'>...</div><script>...</script>"
    },
    {
      "type": "process_flow",
      "title": "Solving any F = ma problem",
      "steps": [
        { "label": "Identify knowns", "description": "List which of F, m, and a are given" },
        { "label": "Draw a free-body diagram", "description": "Draw the object and all force arrows" },
        { "label": "Sum the forces", "description": "Add forces in each direction. Remember: direction matters." },
        { "label": "Solve for the unknown", "description": "Rearrange F = ma for whichever variable is missing" }
      ]
    },
    {
      "type": "comparison_table",
      "title": "How mass affects acceleration (same force applied)",
      "columns": ["Object", "Mass", "Force", "Acceleration"],
      "rows": [
        { "label": "Tennis ball", "values": ["0.06 kg", "10 N", "167 m/s²"] },
        { "label": "Soccer ball", "values": ["0.43 kg", "10 N", "23 m/s²"] },
        { "label": "Bowling ball", "values": ["7 kg", "10 N", "1.4 m/s²"] }
      ]
    },
    {
      "type": "mini_quiz",
      "question": "A 2 kg object experiences a net force of 6 N. What is its acceleration?",
      "options": [
        { "label": "A", "text": "12 m/s²", "is_correct": false },
        { "label": "B", "text": "3 m/s²", "is_correct": true },
        { "label": "C", "text": "0.33 m/s²", "is_correct": false },
        { "label": "D", "text": "8 m/s²", "is_correct": false }
      ],
      "explanation": "a = F/m = 6/2 = 3 m/s². You rearrange F = ma by dividing both sides by m."
    },
    {
      "type": "key_takeaway",
      "points": [
        "F = ma: acceleration is proportional to force and inversely proportional to mass",
        "Double the force → double the acceleration (same mass)",
        "Double the mass → half the acceleration (same force)",
        "Net force — not just one force — determines acceleration"
      ]
    }
  ]
}
```

This lesson looks nothing like a markdown dump. It teaches.

---

## Prompt for generating widget_html (the AI sub-task)

When the lesson generator decides a section needs `interactive_widget`, it needs to generate the HTML. This is a separate prompt within the lesson generation flow:

```typescript
const WIDGET_HTML_PROMPT = `
Generate a self-contained HTML widget for this concept: "{concept}"

The widget must:
- Fit in a 600px × 300px container
- Use CSS variables (never hardcode colors): var(--color-primary), var(--color-surface), var(--color-text), var(--color-accent), var(--color-border)
- Be interactive where appropriate (sliders for formulas, click-to-reveal for processes, hover for labels)
- Load fast: minimal JS, no heavy libraries unless necessary
- Order: <style> block → HTML → <script> block

If you need a charting library, use Chart.js from cdn.jsdelivr.net only.
If you need D3, use d3 from cdn.jsdelivr.net only.

No React. No Vue. No build step. Pure HTML/CSS/JS only.
`
```

---

## Phased Rollout

### Phase 1D (first implementation)
- Static generative UI only
- Implement `text`, `concept_definition`, `process_flow`, `key_takeaway`, `mini_quiz`, `comparison_table`
- No `interactive_widget` yet (HTML generation is harder to prompt reliably — validate quality first)
- `LessonRenderer` + all static components

### Phase 1D+ (quality bar hit)
- Add `interactive_widget` and `data_visualization` support
- Widget generation quality gate: human review of 20 widgets before enabling in prod
- `WidgetFrame` sandboxed iframe

### Phase 1E (chat generative UI)
- Add `renderWidget`, `highlightConcept`, `showFlashcard` tools to the chat route
- Theme integration (CSS vars injected from user's current theme)

### Phase 2 (richer widgets)
- Widget library: pre-built widgets for common educational patterns (periodic table hover, circuit builder, geometry explorer, timeline interactions)
- AI chooses from the library OR generates custom — library preferred for speed and quality
- Bidirectional widgets: student interactions in widgets feed back mastery signals

---

## Why This Is Hard to Copy

The generative UI pattern is technically available to any team. But the quality gate — the AI reliably choosing the *right* component for the *right* content — requires:

1. A large enough component library to have good choices
2. Well-calibrated prompts that know when NOT to use a widget
3. Widget HTML that actually works (no rendering artifacts, good dark mode, actually interactive)
4. Integration with the persona — a visual learner gets more `interactive_widget`, a "reading" learner gets more structured text

This takes iteration. The first 50 lessons generated will be wrong. Build the quality feedback loop (lesson ratings, component-level feedback) so you can improve the prompt with evidence.

---

## Sources

- [Reverse-engineering Claude's generative UI](https://michaellivs.com/blog/reverse-engineering-claude-generative-ui)
- [bentossell/visualise — Agent skill for rendering inline interactive visuals](https://github.com/bentossell/visualise)
- [Michaelliv/pi-generative-ui — Claude.ai's generative UI reverse-engineered](https://github.com/Michaelliv/pi-generative-ui)
- [Vercel AI SDK RSC: Streaming React Components](https://ai-sdk.dev/docs/ai-sdk-rsc/streaming-react-components)
- [Introducing AI SDK 3.0 with Generative UI support](https://vercel.com/blog/ai-sdk-3-generative-ui)
- [The Developer's Guide to Generative UI in 2026](https://www.copilotkit.ai/blog/the-developer-s-guide-to-generative-ui-in-2026)
- [Anthropic's Claude can now generate interactive charts and diagrams](https://creati.ai/ai-news/2026-03-13/anthropic-claude-interactive-charts-diagrams-all-users-2026/)

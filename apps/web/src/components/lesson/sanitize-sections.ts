import type { LessonSection } from '@learn-x/validators'

/**
 * Convert flat LLM sections (all fields present, empty for unused types)
 * into the discriminated union shape LessonRenderer expects.
 * Skips sections with missing required data.
 */
export function sanitizeFlatSections(raw: Record<string, unknown>[]): LessonSection[] {
  const out: LessonSection[] = []
  for (const s of raw) {
    const t = s.type as string
    if (!t) continue
    try {
      switch (t) {
        case 'text':
          if (s.content) out.push({ type: 'text', content: s.content as string })
          break
        case 'concept_definition':
          if (s.term && s.definition)
            out.push({
              type: 'concept_definition',
              term: s.term as string,
              definition: s.definition as string,
              ...(s.analogy ? { analogy: s.analogy as string } : {}),
              ...(s.etymology ? { etymology: s.etymology as string } : {}),
            })
          break
        case 'process_flow':
          if (s.title && Array.isArray(s.steps) && s.steps.length) {
            const steps = (s.steps as { label?: string; description?: string }[])
              .filter((st) => st.label && st.description)
              .map((st) => ({ label: st.label!, description: st.description! }))
            if (steps.length) out.push({ type: 'process_flow', title: s.title as string, steps })
          }
          break
        case 'comparison_table':
          if (s.title && Array.isArray(s.columns) && Array.isArray(s.rows)) {
            const rows = (s.rows as { label?: string; values?: string[] }[])
              .filter((r) => r.label && Array.isArray(r.values))
              .map((r) => ({ label: r.label!, values: r.values! }))
            if (rows.length)
              out.push({
                type: 'comparison_table',
                title: s.title as string,
                columns: s.columns as string[],
                rows,
              })
          }
          break
        case 'analogy_card':
          if (s.concept && s.analogy)
            out.push({
              type: 'analogy_card',
              concept: s.concept as string,
              analogy: s.analogy as string,
              mapping: (s.mapping ?? []) as { abstract: string; familiar: string }[],
            })
          break
        case 'key_takeaway':
          if (Array.isArray(s.points) && s.points.length)
            out.push({ type: 'key_takeaway', points: s.points as string[] })
          break
        case 'mini_quiz':
          if (s.question && Array.isArray(s.options) && s.options.length) {
            const opts = (s.options as { label?: string; text?: string; is_correct?: boolean }[])
              .filter((o) => o.label && o.text && typeof o.is_correct === 'boolean')
              .map((o) => ({ label: o.label!, text: o.text!, is_correct: o.is_correct! }))
            if (opts.length)
              out.push({
                type: 'mini_quiz',
                question: s.question as string,
                options: opts,
                explanation: (s.explanation ?? '') as string,
              })
          }
          break
        case 'quote_block':
          if (s.quote)
            out.push({
              type: 'quote_block',
              quote: s.quote as string,
              attribution: (s.attribution ?? '') as string,
            })
          break
        case 'timeline':
          if (s.title && Array.isArray(s.events) && s.events.length)
            out.push({
              type: 'timeline',
              title: s.title as string,
              events: s.events as { date: string; label: string; description: string }[],
            })
          break
        case 'concept_bridge':
          if ((s.from_concept || s.from) && (s.to_concept || s.to))
            out.push({
              type: 'concept_bridge',
              from: (s.from_concept ?? s.from) as string,
              to: (s.to_concept ?? s.to) as string,
              relation: (s.relation ?? 'related') as 'prerequisite' | 'extends' | 'related',
              explanation: (s.explanation ?? '') as string,
            })
          break
        case 'code_explainer':
          if (s.code)
            out.push({
              type: 'code_explainer',
              language: (s.language ?? '') as string,
              code: s.code as string,
              annotations: (s.annotations ?? []) as { line: number; note: string }[],
            })
          break
        case 'interactive_widget':
          if (s.html)
            out.push({
              type: 'interactive_widget',
              title: (s.title ?? '') as string,
              description: (s.description ?? '') as string,
              html: s.html as string,
            })
          break
      }
    } catch {
      // Skip malformed sections
    }
  }
  return out
}

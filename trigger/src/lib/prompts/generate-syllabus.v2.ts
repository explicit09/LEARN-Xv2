export const PROMPT_VERSION = 'generate-syllabus.v2'

export interface SyllabusPromptParams {
  concepts: Array<{ name: string; description?: string | undefined; tags?: string[] | undefined }>
  relations: Array<{ source: string; target: string; type: string }>
  docTitles: string[]
  domain?: string | undefined
  subfield?: string | undefined
  scaffoldingDirection?: string | undefined
}

export function buildGenerateSyllabusPrompt(params: SyllabusPromptParams): string {
  const { concepts, relations, docTitles, domain, subfield, scaffoldingDirection } = params

  const conceptList = concepts
    .map((c) => {
      let line = `- ${c.name}`
      if (c.description) line += `: ${c.description}`
      if (c.tags && c.tags.length > 0) line += ` [${c.tags.join(', ')}]`
      return line
    })
    .join('\n')

  const relationList =
    relations.length > 0
      ? relations.map((r) => `- ${r.source} → ${r.target} (${r.type})`).join('\n')
      : 'No relations detected.'

  const domainSection = domain
    ? `DOMAIN: ${domain}${subfield ? ` / ${subfield}` : ''}
SCAFFOLDING: ${scaffoldingDirection ?? 'foundational-to-advanced'}`
    : ''

  return `You are an expert curriculum designer creating a structured learning syllabus.

${domainSection}

AVAILABLE CONCEPTS (with descriptions and tags):
${conceptList}

CONCEPT RELATIONS (prerequisite graph):
${relationList}

SOURCE DOCUMENTS:
${docTitles.map((t) => `- ${t}`).join('\n')}

Design a logical learning progression. For each topic, specify:
1. Learning objectives — measurable outcomes (use verbs: explain, compare, apply, analyze, evaluate)
2. Which concepts to group together (1-4 related concepts per topic)
3. Which topics are prerequisites for others (use topic indices)
4. Continuity notes — how each topic connects to the previous and next
5. Estimated duration based on concept complexity

Return ONLY valid JSON in this exact format:
{
  "totalLessons": <number>,
  "learningPathRationale": "<1-2 sentences explaining the overall progression>",
  "units": [
    {
      "title": "Unit title",
      "topics": [
        {
          "title": "Topic title",
          "description": "1-2 sentence description",
          "conceptNames": ["concept name 1", "concept name 2"],
          "documentTitles": ["document title 1"],
          "learningObjectives": ["Explain X", "Compare Y and Z", "Apply W to..."],
          "prerequisiteTopicIndices": [],
          "continuityNotes": "Builds on [previous topic]. Prepares for [next topic].",
          "estimatedDurationMinutes": 30
        }
      ]
    }
  ]
}

Rules:
- Create 2-5 units ordered from foundational to advanced
- Each unit should have 2-5 topics
- Each topic should reference 1-4 concepts from the provided list (use exact concept names)
- Reference document titles that are most relevant to each topic (use exact document titles)
- Use the concept relations graph to determine prerequisite ordering
- prerequisiteTopicIndices uses GLOBAL topic index (0-based, across all units)
- Write 2-5 measurable learning objectives per topic
- continuityNotes should reference specific prior/next topics by name
- estimatedDurationMinutes: 15 for simple definitions, 30 for standard, 45 for complex multi-concept topics
- The progression should respect the prerequisite graph — no topic before its dependencies`
}

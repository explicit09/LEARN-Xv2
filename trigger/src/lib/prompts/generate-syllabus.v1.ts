export const PROMPT_VERSION = 'generate-syllabus.v1'

export function buildGenerateSyllabusPrompt(
  conceptNames: string[],
  docTitles: string[],
): string {
  return `You are an expert curriculum designer. Create a structured learning syllabus based on the following concepts and source documents.

AVAILABLE CONCEPTS:
${conceptNames.map((n) => `- ${n}`).join('\n')}

SOURCE DOCUMENTS:
${docTitles.map((t) => `- ${t}`).join('\n')}

Design a logical learning progression with units and topics. Each topic should group related concepts that are best learned together.

Return ONLY valid JSON in this exact format:
{
  "units": [
    {
      "title": "Unit title (e.g. 'Foundations', 'Core Algorithms')",
      "topics": [
        {
          "title": "Topic title",
          "description": "1-2 sentence description of what learners will understand after this topic",
          "conceptNames": ["concept name 1", "concept name 2"],
          "documentTitles": ["document title 1"]
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
- The progression should allow a learner to build understanding step by step
- Topics within a unit should be ordered logically`
}

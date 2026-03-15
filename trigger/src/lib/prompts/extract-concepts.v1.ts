export const PROMPT_VERSION = 'extract-concepts.v1'

export function buildExtractConceptsPrompt(chunks: string[], workspaceName: string): string {
  const chunksText = chunks
    .map((c, i) => `--- Chunk ${i + 1} ---\n${c}`)
    .join('\n\n')

  return `You are an expert knowledge graph builder. Analyze the following document chunks from a workspace called "${workspaceName}" and extract key concepts and their relationships.

DOCUMENT CHUNKS:
${chunksText}

Extract:
1. Key concepts (terms, ideas, techniques, algorithms, principles) that are central to understanding this material
2. Relationships between those concepts

Return ONLY valid JSON in this exact format:
{
  "concepts": [
    {
      "name": "concept name (2-5 words max, title case)",
      "description": "1-2 sentence explanation of what this concept is",
      "tags": ["tag1", "tag2"]
    }
  ],
  "relations": [
    {
      "source": "concept name",
      "target": "concept name",
      "type": "prerequisite|related|part_of|extends"
    }
  ]
}

Rules:
- Extract 5-20 concepts (quality over quantity)
- Concept names must be unique and specific (not generic like "Introduction")
- Tags should be 1-3 lowercase words describing the domain (e.g. "machine learning", "optimization")
- Only create relations between concepts you extracted
- Maximum 30 relations
- relation type meanings:
  - prerequisite: understanding "source" is needed before "target"
  - related: concepts are closely related but neither requires the other
  - part_of: "source" is a component/subset of "target"
  - extends: "source" builds upon or specializes "target"`
}

export const FLASHCARD_GENERATION_PROMPT_VERSION = 'flashcard-generation.v1'

export interface FlashcardGenerationParams {
  title: string
  chunks: string[]
  conceptNames?: string[]
  cardCount?: number
}

export function buildFlashcardGenerationPrompt(params: FlashcardGenerationParams): string {
  const count = params.cardCount ?? 10

  const chunkText = params.chunks.map((c, i) => `[Chunk ${i + 1}]\n${c}`).join('\n\n')

  const conceptHint = params.conceptNames?.length
    ? `\nKey concepts to cover: ${params.conceptNames.join(', ')}`
    : ''

  return `You are an expert educator creating flashcards for spaced-repetition study.

Topic: ${params.title}${conceptHint}

Source material:
${chunkText}

Create exactly ${count} flashcards, each testing one atomic fact or concept.

Return a JSON object:
{
  "flashcards": [
    {
      "front": "Question or prompt",
      "back": "Concise answer (1-3 sentences max)",
      "concept_name": "Concept name or null"
    }
  ]
}

Rules:
- One atomic fact per card
- Prefer active recall prompts ("What is...?", "Define...", "How does X work?")
- concept_name must match one of the key concepts listed, or null`
}

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

Create exactly ${count} flashcards. Each flashcard tests one atomic fact or concept.

Return a JSON object with this exact structure:
{
  "flashcards": [
    {
      "front": "Question or prompt on the front of the card",
      "back": "Concise, complete answer on the back",
      "concept_name": "Name of the concept this card relates to, or null"
    }
  ]
}

Rules:
- Front should be a clear question, definition prompt, or fill-in-the-blank
- Back should be concise (1-3 sentences max) but complete
- One atomic fact per card — never combine multiple ideas
- Prefer active recall prompts ("What is...?", "Define...", "How does X work?")
- Distribute cards across the key concepts in the material
- concept_name must exactly match one of the key concepts listed above, or null`
}

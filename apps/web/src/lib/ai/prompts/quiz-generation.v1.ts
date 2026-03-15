export const QUIZ_GENERATION_PROMPT_VERSION = 'quiz-generation.v1'

export interface QuizGenerationParams {
  conceptName: string
  conceptDescription?: string
  chunks: string[]
  questionCount?: number
  quizType?: 'practice' | 'review' | 'exam_prep' | 'diagnostic'
}

export function buildQuizGenerationPrompt(params: QuizGenerationParams): string {
  const count = params.questionCount ?? 5
  const quizType = params.quizType ?? 'practice'

  const chunkText = params.chunks.map((c, i) => `[Chunk ${i + 1}]\n${c}`).join('\n\n')

  return `You are an expert educator creating quiz questions for a ${quizType} quiz.

Concept: ${params.conceptName}
${params.conceptDescription ? `Description: ${params.conceptDescription}\n` : ''}

Source material:
${chunkText}

Create exactly ${count} quiz questions that test understanding of this concept at different Bloom's taxonomy levels.
Use a mix of question types: multiple_choice, true_false, short_answer, fill_blank.

Return a JSON object with this exact structure:
{
  "questions": [
    {
      "question": "Question text",
      "question_type": "multiple_choice" | "true_false" | "short_answer" | "fill_blank",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],  // only for multiple_choice and true_false
      "correct_answer": "The correct answer or option letter",
      "bloom_level": "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create"
    }
  ]
}

Rules:
- For multiple_choice: provide 4 options labeled A) through D), correct_answer is "A", "B", "C", or "D"
- For true_false: options are ["True", "False"], correct_answer is "True" or "False"
- For short_answer: no options needed, correct_answer is a concise model answer
- For fill_blank: question contains a blank as "___", correct_answer fills the blank
- Questions must be clearly grounded in the source material
- Vary Bloom's levels — avoid clustering at "remember"`
}

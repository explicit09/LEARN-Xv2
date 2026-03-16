export const QUIZ_GENERATION_PROMPT_VERSION = 'quiz-generation.v1'

export interface QuizGenerationParams {
  conceptName: string
  conceptDescription?: string
  chunks: string[]
  questionCount?: number
  quizType?: string
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

Create exactly ${count} quiz questions testing understanding at different Bloom's taxonomy levels.
Use a mix of question types: multiple_choice, true_false, short_answer, fill_blank.

Return a JSON object:
{
  "questions": [
    {
      "question": "Question text",
      "question_type": "multiple_choice|true_false|short_answer|fill_blank",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct_answer": "A|B|C|D for MC, True|False, or model answer",
      "bloom_level": "remember|understand|apply|analyze|evaluate|create"
    }
  ]
}

Rules:
- multiple_choice: 4 options A-D, correct_answer is "A","B","C", or "D"
- true_false: options ["True","False"], correct_answer is "True" or "False"
- short_answer: no options, correct_answer is a concise model answer
- fill_blank: question contains "___", correct_answer fills the blank`
}

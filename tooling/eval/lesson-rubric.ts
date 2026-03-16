// Lesson quality rubric — pure function scoring.
// Measures structural quality of generated lessons.

export interface LessonForEval {
  title: string
  sections: { type: string }[]
  keyTakeaways: string[]
}

export interface LessonScore {
  total: number // 0–1 composite score
  hasTakeaway: boolean
  hasQuiz: boolean
  hasWidget: boolean
  sectionDiversity: number // count of unique section types
  backToBackDefinitions: number // count of consecutive concept_definitions
  sectionCount: number
  takeawayCount: number
}

// Weights for composite score
const W = {
  takeaway: 0.25, // key_takeaway is required
  quiz: 0.15, // mini_quiz aids recall
  diversity: 0.25, // variety of section types
  noBackToBack: 0.15, // avoid definition fatigue
  widget: 0.1, // interactive widgets are a bonus
  length: 0.1, // sufficient section count
} as const

/**
 * Score a lesson's structural quality. Returns 0–1.
 */
export function scoreLesson(lesson: LessonForEval): LessonScore {
  const types = lesson.sections.map((s) => s.type)
  const uniqueTypes = new Set(types)

  const hasTakeaway = types.includes('key_takeaway') && lesson.keyTakeaways.length > 0
  const hasQuiz = types.includes('mini_quiz')
  const hasWidget = types.includes('interactive_widget')

  // Count back-to-back concept_definitions
  let backToBackDefinitions = 0
  for (let i = 1; i < types.length; i++) {
    if (types[i] === 'concept_definition' && types[i - 1] === 'concept_definition') {
      backToBackDefinitions++
    }
  }

  // Diversity: 5+ unique types is ideal
  const diversityScore = Math.min(uniqueTypes.size / 5, 1)

  // Length: 5+ sections is good
  const lengthScore = Math.min(types.length / 5, 1)

  // Back-to-back penalty: 0 is perfect, 3+ is bad
  const backToBackPenalty = Math.max(0, 1 - backToBackDefinitions * 0.33)

  // Composite
  const total = Math.min(
    1,
    Math.max(
      0,
      (hasTakeaway ? W.takeaway : 0) +
        (hasQuiz ? W.quiz : 0) +
        diversityScore * W.diversity +
        backToBackPenalty * W.noBackToBack +
        (hasWidget ? W.widget : 0) +
        lengthScore * W.length,
    ),
  )

  return {
    total,
    hasTakeaway,
    hasQuiz,
    hasWidget,
    sectionDiversity: uniqueTypes.size,
    backToBackDefinitions,
    sectionCount: types.length,
    takeawayCount: lesson.keyTakeaways.length,
  }
}

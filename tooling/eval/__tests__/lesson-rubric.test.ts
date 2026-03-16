import { describe, it, expect } from 'vitest'
import { scoreLesson, type LessonForEval } from '../lesson-rubric'

function makeLesson(overrides: Partial<LessonForEval> = {}): LessonForEval {
  return {
    title: 'Test Lesson',
    sections: [
      { type: 'text' },
      { type: 'concept_definition' },
      { type: 'analogy_card' },
      { type: 'process_flow' },
      { type: 'mini_quiz' },
      { type: 'comparison_table' },
      { type: 'key_takeaway' },
    ],
    keyTakeaways: ['point1', 'point2', 'point3'],
    ...overrides,
  }
}

describe('scoreLesson', () => {
  it('gives a perfect score to a well-structured lesson', () => {
    const result = scoreLesson(makeLesson())
    expect(result.total).toBeGreaterThanOrEqual(0.8)
    expect(result.hasTakeaway).toBe(true)
    expect(result.hasQuiz).toBe(true)
    expect(result.sectionDiversity).toBeGreaterThanOrEqual(5)
  })

  it('penalizes missing key_takeaway', () => {
    const result = scoreLesson(
      makeLesson({
        sections: [{ type: 'text' }, { type: 'concept_definition' }, { type: 'mini_quiz' }],
        keyTakeaways: [],
      }),
    )
    expect(result.hasTakeaway).toBe(false)
    expect(result.total).toBeLessThan(0.6)
  })

  it('penalizes missing mini_quiz', () => {
    const result = scoreLesson(
      makeLesson({
        sections: [{ type: 'text' }, { type: 'concept_definition' }, { type: 'key_takeaway' }],
      }),
    )
    expect(result.hasQuiz).toBe(false)
    expect(result.total).toBeLessThan(0.8)
  })

  it('penalizes low section diversity (all text)', () => {
    const result = scoreLesson(
      makeLesson({
        sections: [{ type: 'text' }, { type: 'text' }, { type: 'text' }, { type: 'key_takeaway' }],
        keyTakeaways: ['a', 'b'],
      }),
    )
    expect(result.sectionDiversity).toBeLessThan(3)
    expect(result.total).toBeLessThan(0.6)
  })

  it('penalizes back-to-back concept_definitions', () => {
    const result = scoreLesson(
      makeLesson({
        sections: [
          { type: 'text' },
          { type: 'concept_definition' },
          { type: 'concept_definition' },
          { type: 'concept_definition' },
          { type: 'key_takeaway' },
        ],
        keyTakeaways: ['a'],
      }),
    )
    expect(result.backToBackDefinitions).toBeGreaterThan(0)
    expect(result.total).toBeLessThan(0.7)
  })

  it('rewards interactive_widget presence', () => {
    const withWidget = scoreLesson(
      makeLesson({
        sections: [
          { type: 'text' },
          { type: 'concept_definition' },
          { type: 'interactive_widget' },
          { type: 'mini_quiz' },
          { type: 'key_takeaway' },
        ],
      }),
    )
    const without = scoreLesson(
      makeLesson({
        sections: [
          { type: 'text' },
          { type: 'concept_definition' },
          { type: 'mini_quiz' },
          { type: 'key_takeaway' },
        ],
      }),
    )
    expect(withWidget.hasWidget).toBe(true)
    expect(without.hasWidget).toBe(false)
    expect(withWidget.total).toBeGreaterThan(without.total)
  })

  it('returns score between 0 and 1', () => {
    const result = scoreLesson(makeLesson())
    expect(result.total).toBeGreaterThanOrEqual(0)
    expect(result.total).toBeLessThanOrEqual(1)
  })
})

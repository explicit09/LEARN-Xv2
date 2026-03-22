import { describe, it, expect } from 'vitest'
import { scoreFlashcardSet, scoreLesson, selectWithVariety } from '../score-plan-items'
import type { FlashcardSetCandidate, LessonCandidate, ScoringContext } from '../types'

function makeContext(overrides: Partial<ScoringContext> = {}): ScoringContext {
  return {
    masteryMap: new Map(),
    prerequisiteMap: new Map(),
    weakConceptIds: new Set(),
    examDaysRemaining: null,
    maxLessonOrderIndex: 10,
    ...overrides,
  }
}

describe('scoreFlashcardSet', () => {
  it('scores higher with more due cards', () => {
    const ctx = makeContext()
    const few: FlashcardSetCandidate = {
      setId: 's1',
      workspaceId: 'w1',
      dueCount: 2,
      avgOverdueDays: 0,
      avgLapses: 0,
      conceptIds: [],
    }
    const many: FlashcardSetCandidate = {
      setId: 's2',
      workspaceId: 'w1',
      dueCount: 8,
      avgOverdueDays: 0,
      avgLapses: 0,
      conceptIds: [],
    }
    expect(scoreFlashcardSet(many, ctx)).toBeGreaterThan(scoreFlashcardSet(few, ctx))
  })

  it('boosts overdue cards', () => {
    const ctx = makeContext()
    const onTime: FlashcardSetCandidate = {
      setId: 's1',
      workspaceId: 'w1',
      dueCount: 3,
      avgOverdueDays: 0,
      avgLapses: 0,
      conceptIds: [],
    }
    const overdue: FlashcardSetCandidate = {
      setId: 's2',
      workspaceId: 'w1',
      dueCount: 3,
      avgOverdueDays: 3,
      avgLapses: 0,
      conceptIds: [],
    }
    expect(scoreFlashcardSet(overdue, ctx)).toBeGreaterThan(scoreFlashcardSet(onTime, ctx))
  })

  it('boosts when exam is near and concepts are weak', () => {
    const ctx = makeContext({
      examDaysRemaining: 3,
      weakConceptIds: new Set(['c1', 'c2']),
    })
    const noOverlap: FlashcardSetCandidate = {
      setId: 's1',
      workspaceId: 'w1',
      dueCount: 2,
      avgOverdueDays: 0,
      avgLapses: 0,
      conceptIds: ['c3'],
    }
    const hasOverlap: FlashcardSetCandidate = {
      setId: 's2',
      workspaceId: 'w1',
      dueCount: 2,
      avgOverdueDays: 0,
      avgLapses: 0,
      conceptIds: ['c1', 'c2'],
    }
    expect(scoreFlashcardSet(hasOverlap, ctx)).toBeGreaterThan(scoreFlashcardSet(noOverlap, ctx))
  })
})

describe('scoreLesson', () => {
  it('returns 0 if prerequisites are not met', () => {
    const ctx = makeContext({
      prerequisiteMap: new Map([['c1', ['c0']]]),
      masteryMap: new Map([['c0', 0.1]]), // too low
    })
    const lesson: LessonCandidate = {
      lessonId: 'l1',
      workspaceId: 'w1',
      orderIndex: 0,
      conceptIds: ['c1'],
      title: 'Test',
    }
    expect(scoreLesson(lesson, ctx)).toBe(0)
  })

  it('allows lesson when prerequisites are mastered', () => {
    const ctx = makeContext({
      prerequisiteMap: new Map([['c1', ['c0']]]),
      masteryMap: new Map([['c0', 0.5]]),
    })
    const lesson: LessonCandidate = {
      lessonId: 'l1',
      workspaceId: 'w1',
      orderIndex: 0,
      conceptIds: ['c1'],
      title: 'Test',
    }
    expect(scoreLesson(lesson, ctx)).toBeGreaterThan(0)
  })

  it('scores earlier lessons higher', () => {
    const ctx = makeContext()
    const early: LessonCandidate = {
      lessonId: 'l1',
      workspaceId: 'w1',
      orderIndex: 1,
      conceptIds: [],
      title: 'Early',
    }
    const late: LessonCandidate = {
      lessonId: 'l2',
      workspaceId: 'w1',
      orderIndex: 9,
      conceptIds: [],
      title: 'Late',
    }
    expect(scoreLesson(early, ctx)).toBeGreaterThan(scoreLesson(late, ctx))
  })

  it('scores higher for lessons covering low-mastery concepts', () => {
    const ctx = makeContext({
      masteryMap: new Map([
        ['c1', 0.1],
        ['c2', 0.9],
      ]),
    })
    const weak: LessonCandidate = {
      lessonId: 'l1',
      workspaceId: 'w1',
      orderIndex: 5,
      conceptIds: ['c1'],
      title: 'Weak',
    }
    const strong: LessonCandidate = {
      lessonId: 'l2',
      workspaceId: 'w1',
      orderIndex: 5,
      conceptIds: ['c2'],
      title: 'Strong',
    }
    expect(scoreLesson(weak, ctx)).toBeGreaterThan(scoreLesson(strong, ctx))
  })
})

describe('selectWithVariety', () => {
  it('guarantees at least 1 review and 1 lesson when both exist', () => {
    const items = [
      {
        item: {
          type: 'flashcard_review',
          resourceId: 'r1',
          resourceType: 'flashcard_set',
          estimatedMinutes: 5,
          completed: false,
        },
        score: 10,
      },
      {
        item: {
          type: 'lesson',
          resourceId: 'l1',
          resourceType: 'lesson',
          estimatedMinutes: 15,
          completed: false,
        },
        score: 90,
      },
      {
        item: {
          type: 'lesson',
          resourceId: 'l2',
          resourceType: 'lesson',
          estimatedMinutes: 15,
          completed: false,
        },
        score: 80,
      },
      {
        item: {
          type: 'lesson',
          resourceId: 'l3',
          resourceType: 'lesson',
          estimatedMinutes: 15,
          completed: false,
        },
        score: 70,
      },
      {
        item: {
          type: 'lesson',
          resourceId: 'l4',
          resourceType: 'lesson',
          estimatedMinutes: 15,
          completed: false,
        },
        score: 60,
      },
    ]
    const result = selectWithVariety(items, 5)
    expect(result.some((r) => r.item.type === 'flashcard_review')).toBe(true)
    expect(result.some((r) => r.item.type === 'lesson')).toBe(true)
  })

  it('caps at the specified limit', () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      item: {
        type: 'lesson',
        resourceId: `l${i}`,
        resourceType: 'lesson',
        estimatedMinutes: 15,
        completed: false,
      },
      score: 50 - i,
    }))
    expect(selectWithVariety(items, 5)).toHaveLength(5)
  })

  it('returns fewer than cap if not enough candidates', () => {
    const items = [
      {
        item: {
          type: 'lesson',
          resourceId: 'l1',
          resourceType: 'lesson',
          estimatedMinutes: 15,
          completed: false,
        },
        score: 50,
      },
    ]
    expect(selectWithVariety(items, 5)).toHaveLength(1)
  })
})

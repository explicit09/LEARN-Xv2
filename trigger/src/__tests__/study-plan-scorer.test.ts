import { describe, it, expect } from 'vitest'
import { prioritizeStudyItems, type StudyCandidate } from '../lib/study-plan-scorer'

describe('prioritizeStudyItems', () => {
  it('returns empty array when no candidates', () => {
    expect(prioritizeStudyItems([])).toEqual([])
  })

  it('limits output to 5 items', () => {
    const candidates: StudyCandidate[] = Array.from({ length: 10 }, (_, i) => ({
      type: 'lesson' as const,
      resourceId: `lesson-${i}`,
      title: `Lesson ${i}`,
      urgency: 0.5,
      estimatedMinutes: 15,
      workspaceId: 'ws-1',
    }))
    expect(prioritizeStudyItems(candidates)).toHaveLength(5)
  })

  it('prioritizes due flashcards over lessons', () => {
    const candidates: StudyCandidate[] = [
      { type: 'lesson', resourceId: 'l1', title: 'Lesson', urgency: 0.3, estimatedMinutes: 15, workspaceId: 'ws-1' },
      { type: 'flashcard_review', resourceId: 'fc1', title: 'Review', urgency: 0.8, estimatedMinutes: 10, workspaceId: 'ws-1' },
    ]
    const result = prioritizeStudyItems(candidates)
    expect(result[0]?.type).toBe('flashcard_review')
  })

  it('prioritizes higher urgency items first', () => {
    const candidates: StudyCandidate[] = [
      { type: 'lesson', resourceId: 'l1', title: 'Low', urgency: 0.2, estimatedMinutes: 15, workspaceId: 'ws-1' },
      { type: 'lesson', resourceId: 'l2', title: 'High', urgency: 0.9, estimatedMinutes: 15, workspaceId: 'ws-1' },
      { type: 'lesson', resourceId: 'l3', title: 'Med', urgency: 0.5, estimatedMinutes: 15, workspaceId: 'ws-1' },
    ]
    const result = prioritizeStudyItems(candidates)
    expect(result.map((r) => r.title)).toEqual(['High', 'Med', 'Low'])
  })

  it('calculates total estimated time', () => {
    const candidates: StudyCandidate[] = [
      { type: 'lesson', resourceId: 'l1', title: 'A', urgency: 0.5, estimatedMinutes: 15, workspaceId: 'ws-1' },
      { type: 'flashcard_review', resourceId: 'fc1', title: 'B', urgency: 0.8, estimatedMinutes: 10, workspaceId: 'ws-1' },
    ]
    const result = prioritizeStudyItems(candidates)
    const totalMinutes = result.reduce((sum, r) => sum + r.estimatedMinutes, 0)
    expect(totalMinutes).toBe(25)
  })

  it('assigns completed: false to all items', () => {
    const candidates: StudyCandidate[] = [
      { type: 'lesson', resourceId: 'l1', title: 'A', urgency: 0.5, estimatedMinutes: 15, workspaceId: 'ws-1' },
    ]
    const result = prioritizeStudyItems(candidates)
    expect(result.every((r) => r.completed === false)).toBe(true)
  })
})

// Pure function for prioritizing study plan items.
// No database calls, no side effects — fully testable.

export interface StudyCandidate {
  type: 'flashcard_review' | 'lesson' | 'quiz' | 'concept_review'
  resourceId: string
  title: string
  urgency: number // 0–1, higher = more urgent
  estimatedMinutes: number
  workspaceId: string
}

export interface PlanItem {
  type: string
  resourceId: string
  title: string
  estimatedMinutes: number
  completed: boolean
  workspaceId: string
}

const MAX_ITEMS = 5

/**
 * Sorts candidates by urgency (descending), limits to MAX_ITEMS,
 * and returns them as PlanItems with completed: false.
 */
export function prioritizeStudyItems(candidates: StudyCandidate[]): PlanItem[] {
  return candidates
    .sort((a, b) => b.urgency - a.urgency)
    .slice(0, MAX_ITEMS)
    .map((c) => ({
      type: c.type,
      resourceId: c.resourceId,
      title: c.title,
      estimatedMinutes: c.estimatedMinutes,
      completed: false,
      workspaceId: c.workspaceId,
    }))
}

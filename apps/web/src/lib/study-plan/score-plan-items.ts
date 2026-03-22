import type {
  FlashcardSetCandidate,
  LessonCandidate,
  PlanItem,
  ScoredItem,
  ScoringContext,
} from './types'

const PREREQ_MASTERY_THRESHOLD = 0.3

export function scoreFlashcardSet(set: FlashcardSetCandidate, ctx: ScoringContext): number {
  let score = 0

  // Base: due cards exist (0-20)
  score += Math.min(20, set.dueCount * 4)

  // Overdue urgency (0-30)
  score += Math.min(30, set.avgOverdueDays * 10)

  // Lapse risk (0-15)
  score += Math.min(15, set.avgLapses * 3)

  // Exam proximity boost (0-20)
  if (ctx.examDaysRemaining !== null && ctx.examDaysRemaining <= 14) {
    const weakOverlap = set.conceptIds.filter((id) => ctx.weakConceptIds.has(id)).length
    const examUrgency = Math.max(0, 1 - ctx.examDaysRemaining / 14)
    score += Math.min(20, weakOverlap * 5 * examUrgency)
  }

  return Math.min(85, Math.round(score))
}

export function scoreLesson(lesson: LessonCandidate, ctx: ScoringContext): number {
  // Prerequisite gate
  for (const conceptId of lesson.conceptIds) {
    const prereqs = ctx.prerequisiteMap.get(conceptId) ?? []
    for (const prereqId of prereqs) {
      if ((ctx.masteryMap.get(prereqId) ?? 0) < PREREQ_MASTERY_THRESHOLD) {
        return 0
      }
    }
  }

  let score = 0

  // Sequence bonus: earlier = higher (0-20)
  const maxIdx = Math.max(ctx.maxLessonOrderIndex, 1)
  score += Math.round((1 - lesson.orderIndex / maxIdx) * 20)

  // Mastery gap: concepts this lesson teaches that have low mastery (0-25)
  if (lesson.conceptIds.length > 0) {
    const avgGap =
      lesson.conceptIds.reduce((sum, id) => sum + (1 - (ctx.masteryMap.get(id) ?? 0)), 0) /
      lesson.conceptIds.length
    score += Math.round(avgGap * 25)
  } else {
    score += 12 // default when no concept mapping
  }

  // Exam proximity boost (0-15)
  if (ctx.examDaysRemaining !== null && ctx.examDaysRemaining <= 14) {
    const weakOverlap = lesson.conceptIds.filter((id) => ctx.weakConceptIds.has(id)).length
    score += Math.min(15, weakOverlap * 5)
  }

  return Math.min(85, Math.round(score))
}

export function selectWithVariety(scored: ScoredItem[], cap: number): ScoredItem[] {
  const reviews = scored
    .filter((s) => s.item.type === 'flashcard_review')
    .sort((a, b) => b.score - a.score)
  const lessons = scored.filter((s) => s.item.type === 'lesson').sort((a, b) => b.score - a.score)

  const selected: ScoredItem[] = []

  // Guarantee at least 1 review if any exist
  if (reviews.length > 0) selected.push(reviews.shift()!)
  // Guarantee at least 1 lesson if any exist
  if (lessons.length > 0) selected.push(lessons.shift()!)

  // Fill remaining from combined sorted pool
  const remaining = [...reviews, ...lessons].sort((a, b) => b.score - a.score)
  for (const item of remaining) {
    if (selected.length >= cap) break
    selected.push(item)
  }

  return selected.sort((a, b) => b.score - a.score)
}

/** Build a reason string for a flashcard review item. */
export function flashcardReason(set: FlashcardSetCandidate): string {
  if (set.avgOverdueDays >= 1) {
    return `${set.dueCount} overdue card${set.dueCount === 1 ? '' : 's'}`
  }
  return `${set.dueCount} card${set.dueCount === 1 ? '' : 's'} ready for review`
}

/** Build a reason string for a lesson item. */
export function lessonReason(lesson: LessonCandidate, ctx: ScoringContext): string {
  const weakConcepts = lesson.conceptIds.filter((id) => ctx.weakConceptIds.has(id))
  if (weakConcepts.length > 0) return `Covers weak area`
  if (lesson.orderIndex === 0) return 'First lesson in sequence'
  return 'Next in curriculum'
}

/** Score all candidates and return top items with reasons. */
export function buildScoredPlanItems(
  flashcardSets: FlashcardSetCandidate[],
  lessons: LessonCandidate[],
  ctx: ScoringContext,
  cap = 5,
): PlanItem[] {
  const scored: ScoredItem[] = []

  for (const set of flashcardSets) {
    const score = scoreFlashcardSet(set, ctx)
    if (score <= 0) continue
    scored.push({
      score,
      item: {
        type: 'flashcard_review',
        resourceId: set.setId,
        resourceType: 'flashcard_set',
        estimatedMinutes: Math.min(15, Math.max(2, Math.round(set.dueCount * 1.5))),
        completed: false,
        workspaceId: set.workspaceId,
        score,
        reason: flashcardReason(set),
        title: 'Flashcard Review',
      },
    })
  }

  for (const lesson of lessons) {
    const score = scoreLesson(lesson, ctx)
    if (score <= 0) continue
    scored.push({
      score,
      item: {
        type: 'lesson',
        resourceId: lesson.lessonId,
        resourceType: 'lesson',
        estimatedMinutes: 12,
        completed: false,
        workspaceId: lesson.workspaceId,
        score,
        reason: lessonReason(lesson, ctx),
        title: lesson.title,
      },
    })
  }

  return selectWithVariety(scored, cap).map((s) => s.item)
}

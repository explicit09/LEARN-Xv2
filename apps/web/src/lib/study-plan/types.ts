export interface PlanItem {
  type: string // 'flashcard_review' | 'lesson'
  resourceId: string
  resourceType: string // 'flashcard_set' | 'lesson'
  estimatedMinutes: number
  completed: boolean
  workspaceId?: string
  score?: number
  reason?: string
  title?: string
}

export interface FlashcardSetCandidate {
  setId: string
  workspaceId: string
  dueCount: number
  avgOverdueDays: number
  avgLapses: number
  conceptIds: string[]
}

export interface LessonCandidate {
  lessonId: string
  workspaceId: string
  orderIndex: number
  conceptIds: string[]
  title: string
}

export interface ScoringContext {
  masteryMap: Map<string, number>
  prerequisiteMap: Map<string, string[]>
  weakConceptIds: Set<string>
  examDaysRemaining: number | null
  maxLessonOrderIndex: number
}

export interface ScoredItem {
  item: PlanItem
  score: number
}

export interface CoachContext {
  hasWorkspaces: boolean
  dueCardCount: number
  overdueCardCount: number
  pendingItemCount: number
  completedTodayCount: number
  totalPlanItems: number
  studyStreak: number
  daysSinceLastSession: number
  examDaysRemaining: number | null
  readinessScore: number | null
  fadingConceptCount: number
  topWeakConcept: string | null
  topItemReason: string | null
}

export interface CoachMessage {
  eyebrow: string
  title: string
  body: string
  tone: 'blue' | 'orange' | 'emerald' | 'red' | 'purple'
}

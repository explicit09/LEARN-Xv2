import { redirect } from 'next/navigation'
import { createServerCaller } from '@/lib/trpc/server'
import { createClient } from '@/lib/supabase/server'
import { getWorkspaceOverviews } from '@/lib/workspace/get-workspace-overviews'
import { buildCoachMessage } from '@/lib/study-plan/coach-signals'
import { getCoachAiMessage } from '@/lib/study-plan/coach-ai'
import type { PlanItem } from '@/server/routers/studyPlan'
import type { CoachMessage } from '@/lib/study-plan/types'
import { DashboardV1 } from './DashboardV1'

function getPlanHref(item: PlanItem | undefined): string {
  if (!item?.workspaceId) return '/dashboard'
  if (item.type === 'flashcard_review') return `/workspace/${item.workspaceId}?tab=flashcards`
  if (item.type === 'lesson') return `/workspace/${item.workspaceId}/lesson/${item.resourceId}`
  return `/workspace/${item.workspaceId}`
}

export default async function DashboardPage() {
  const caller = await createServerCaller()

  let profile
  try {
    profile = await caller.user.getProfile()
  } catch {
    redirect('/login')
  }

  if (!profile.onboarding_completed) {
    redirect('/onboarding')
  }

  const workspaces = await caller.workspace.list()
  const workspacesWithOverview = await getWorkspaceOverviews(caller, workspaces)

  let studyPlan: {
    id?: string
    items: PlanItem[]
    examDate?: string | null
    readinessScore?: number | null
  } = {
    items: [],
  }
  try {
    studyPlan = await caller.studyPlan.getToday({})
  } catch {
    // user may have no plan yet
  }

  let studyStreak = 0
  let overdueCardCount = 0
  try {
    const dashboard = await caller.analytics.getDashboard()
    studyStreak = dashboard.studyStreak
  } catch {
    // analytics may fail — don't block the page
  }

  // Gather coach signals
  let fadingConceptCount = 0
  let topWeakConcept: string | null = null
  let daysSinceLastSession = 0
  try {
    const digest = await caller.notification.getDailyDigest({})
    overdueCardCount = digest.dueFlashcards
    fadingConceptCount = digest.fadingConcepts.length
    topWeakConcept = digest.fadingConcepts[0]?.name ?? null
  } catch {
    // non-critical
  }

  // Compute days since last activity from heatmap data
  try {
    const heatmap = await caller.analytics.getStudyHeatmap({})
    if (heatmap.length > 0) {
      const lastDate = heatmap[heatmap.length - 1]!.date
      const diff = Date.now() - new Date(lastDate).getTime()
      daysSinceLastSession = Math.floor(diff / 86_400_000)
    }
  } catch {
    // non-critical
  }

  const pendingItems = studyPlan.items.filter((item) => !item.completed)
  const completedCount = studyPlan.items.length - pendingItems.length
  const dueCardCount = studyPlan.items.filter(
    (item) => item.type === 'flashcard_review' && !item.completed,
  ).length
  const totalMinutes = studyPlan.items.reduce((sum, item) => sum + (item.estimatedMinutes ?? 0), 0)
  const continueHref =
    pendingItems.length > 0
      ? getPlanHref(pendingItems[0])
      : workspaces.length > 0
        ? '/dashboard'
        : '/workspaces'

  const examDaysRemaining = studyPlan.examDate
    ? Math.ceil((new Date(studyPlan.examDate).getTime() - Date.now()) / 86_400_000)
    : null

  const coachCtx = {
    hasWorkspaces: workspaces.length > 0,
    dueCardCount,
    overdueCardCount,
    pendingItemCount: pendingItems.length,
    completedTodayCount: completedCount,
    totalPlanItems: studyPlan.items.length,
    studyStreak,
    daysSinceLastSession,
    examDaysRemaining,
    readinessScore: studyPlan.readinessScore ?? null,
    fadingConceptCount,
    topWeakConcept,
    topItemReason: pendingItems[0]?.reason ?? null,
  }
  const coachMessage: CoachMessage = buildCoachMessage(coachCtx)

  // AI coach: only fires if a heartbeat was stored today
  let coachAiMessage: string | null = null
  try {
    const supabase = await createClient()
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (userId) {
      coachAiMessage = await getCoachAiMessage(supabase, userId, studyPlan.id, coachCtx)
    }
  } catch {
    // AI coach is non-critical — fall back to rule-based
  }

  return (
    <>
      <DashboardV1
        displayName={profile.display_name?.split(' ')[0] || 'Learner'}
        workspacesCount={workspaces.length}
        hasWorkspaces={workspaces.length > 0}
        dueCardCount={dueCardCount}
        completedCount={completedCount}
        totalMinutes={totalMinutes}
        totalPlanItems={studyPlan.items.length}
        pendingItems={pendingItems}
        continueHref={continueHref}
        examDate={studyPlan.examDate ?? null}
        readinessScore={studyPlan.readinessScore ?? null}
        studyStreak={studyStreak}
        coachMessage={coachMessage}
        coachAiMessage={coachAiMessage}
        workspaces={workspacesWithOverview.map((workspace) => ({
          id: workspace.id,
          name: workspace.name,
          description: workspace.description,
          documentsCount: workspace.documentsCount,
          conceptsCount: workspace.conceptsCount,
          lessonsCount: workspace.lessonsCount,
          completedLessonsCount: workspace.completedLessonsCount,
          nextActionLabel: workspace.nextActionLabel,
          nextActionHref: workspace.nextActionHref,
          updatedAt: workspace.updated_at as string | null,
        }))}
      />
    </>
  )
}

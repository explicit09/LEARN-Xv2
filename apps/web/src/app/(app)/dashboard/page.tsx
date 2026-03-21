import { redirect } from 'next/navigation'
import { createServerCaller } from '@/lib/trpc/server'
import { getWorkspaceOverviews } from '@/lib/workspace/get-workspace-overviews'
import type { PlanItem } from '@/server/routers/studyPlan'
import { DashboardV1 } from './DashboardV1'

function getPlanHref(item: PlanItem | undefined): string {
  if (!item?.workspaceId) return '/dashboard'
  if (item.type === 'flashcard_review') return `/workspace/${item.workspaceId}/flashcards`
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

  let studyPlan: { items: PlanItem[]; examDate?: string | null; readinessScore?: number | null } = {
    items: [],
  }
  try {
    studyPlan = await caller.studyPlan.getToday({})
  } catch {
    // user may have no plan yet
  }

  const pendingItems = studyPlan.items.filter((item) => !item.completed)
  const completedCount = studyPlan.items.length - pendingItems.length
  const dueCardCount = studyPlan.items.filter((item) => item.type === 'flashcard_review').length
  const totalMinutes = studyPlan.items.reduce((sum, item) => sum + (item.estimatedMinutes ?? 0), 0)
  const continueHref =
    pendingItems.length > 0
      ? getPlanHref(pendingItems[0])
      : workspaces.length > 0
        ? '/dashboard'
        : '/workspaces'

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

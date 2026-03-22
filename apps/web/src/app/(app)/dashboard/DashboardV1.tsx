'use client'

import type { PlanItem } from '@/server/routers/studyPlan'
import type { CoachMessage } from '@/lib/study-plan/types'
import { QuickActionsDock } from '@/components/layout/QuickActionsDock'
import { FadeIn } from './DashboardAnimations'
import { HeroSection } from './HeroSection'
import { PlanSection } from './PlanSection'
import { CoachSection } from './CoachSection'
import { WorkspacesGallery } from './WorkspacesGallery'

export interface WorkspaceOverviewCard {
  id: string
  name: string
  description?: string | null
  documentsCount: number
  conceptsCount: number
  lessonsCount: number
  completedLessonsCount: number
  nextActionLabel?: string
  nextActionHref?: string
  updatedAt?: string | null
}

export interface DashboardV1Props {
  displayName: string
  workspacesCount: number
  hasWorkspaces: boolean
  dueCardCount: number
  completedCount: number
  totalMinutes: number
  totalPlanItems: number
  pendingItems: PlanItem[]
  workspaces: WorkspaceOverviewCard[]
  continueHref: string
  examDate: string | null
  readinessScore: number | null
  studyStreak: number
  coachMessage: CoachMessage
  coachAiMessage: string | null
}

export function DashboardV1(props: DashboardV1Props) {
  return (
    <div className="space-y-6 sm:space-y-10 mx-auto w-full max-w-[1400px] p-3 sm:p-4 md:p-8 pb-24">
      <FadeIn>
        <HeroSection
          displayName={props.displayName}
          workspacesCount={props.workspacesCount}
          continueHref={props.continueHref}
          completedCount={props.completedCount}
          totalPlanItems={props.totalPlanItems}
          studyStreak={props.studyStreak}
        />
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="flex flex-col-reverse lg:grid lg:grid-cols-2 gap-4 sm:gap-6 px-0 sm:px-1">
          <PlanSection
            pendingItems={props.pendingItems}
            totalMinutes={props.totalMinutes}
            totalPlanItems={props.totalPlanItems}
            completedCount={props.completedCount}
          />
          <CoachSection
            completedCount={props.completedCount}
            totalPlanItems={props.totalPlanItems}
            pendingItems={props.pendingItems}
            examDate={props.examDate ?? null}
            readinessScore={props.readinessScore ?? null}
            coachMessage={props.coachMessage}
            coachAiMessage={props.coachAiMessage}
          />
        </div>
      </FadeIn>

      <WorkspacesGallery workspaces={props.workspaces} hasWorkspaces={props.hasWorkspaces} />

      <QuickActionsDock />
    </div>
  )
}

'use client'

import Link from 'next/link'
import { ArrowRight, Flame } from 'lucide-react'
import { Button } from '@learn-x/ui'
import type { DashboardV1Props } from './DashboardV1'

function getDailyDetail(completedCount: number, totalPlanItems: number): string {
  if (totalPlanItems === 0) return 'Complete a lesson to start'
  if (completedCount >= totalPlanItems) return 'All planned actions done'
  if (completedCount > 0) {
    const remaining = Math.max(totalPlanItems - completedCount, 0)
    return `${completedCount} done, ${remaining} left today`
  }
  return `${totalPlanItems} action${totalPlanItems === 1 ? '' : 's'} planned today`
}

type HeroProps = Pick<
  DashboardV1Props,
  | 'displayName'
  | 'workspacesCount'
  | 'continueHref'
  | 'completedCount'
  | 'totalPlanItems'
  | 'studyStreak'
>

export function HeroSection({
  displayName,
  workspacesCount,
  continueHref,
  completedCount,
  totalPlanItems,
  studyStreak,
}: HeroProps) {
  const dailyDetail = getDailyDetail(completedCount, totalPlanItems)
  const streakClasses =
    studyStreak > 0
      ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300'
      : 'bg-muted text-muted-foreground'

  const resumeLabel =
    totalPlanItems > 0
      ? `${Math.max(totalPlanItems - completedCount, 0)} action${Math.max(totalPlanItems - completedCount, 0) === 1 ? '' : 's'} left`
      : null

  return (
    <div className="relative rounded-2xl md:rounded-[2.5rem] overflow-hidden p-4 sm:p-6 md:p-16 border border-border shadow-2xl bg-gradient-to-br from-accent to-secondary dark:from-card dark:to-card dark:bg-card group">
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] bg-repeat pointer-events-none" />
      <div className="absolute top-0 right-0 w-[400px] md:w-[800px] h-[400px] md:h-[800px] bg-gradient-to-b from-primary/15 dark:from-primary/10 via-primary/5 dark:via-primary/5 to-transparent rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-3 md:space-y-4 max-w-2xl">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
            {displayName}
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${streakClasses}`}
            >
              <Flame className="w-4 h-4" />
              <span>{studyStreak > 0 ? `${studyStreak}-day streak` : 'Start your streak'}</span>
            </div>
            <span className="text-sm text-muted-foreground">{dailyDetail}</span>
          </div>
          <p className="hidden md:block max-w-xl text-sm leading-7 text-muted-foreground md:text-base">
            {workspacesCount > 0
              ? `${workspacesCount} active workspace${workspacesCount === 1 ? '' : 's'}. Continue where you left off, clear due reviews, and keep momentum high.`
              : 'Create your first workspace to turn notes, slides, and readings into a guided study flow.'}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Link href="/workspaces" className="hidden md:block">
            <Button
              variant="ghost"
              className="h-12 md:h-14 px-4 rounded-xl md:rounded-2xl text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              View Workspaces
            </Button>
          </Link>
          <Link href={continueHref} className="w-full md:w-auto">
            <Button
              size="lg"
              className="w-full md:w-auto min-h-[48px] rounded-xl md:rounded-2xl h-auto py-2.5 md:py-3 px-6 md:px-8 bg-white text-black hover:bg-gray-200 font-bold text-base shadow-xl shadow-white/5 transition-transform hover:scale-105 flex-col items-start md:flex-row md:items-center gap-0 md:gap-2"
            >
              <span className="flex items-center">
                {resumeLabel ? 'Continue' : 'Start Session'} <ArrowRight className="ml-2 w-5 h-5" />
              </span>
              {resumeLabel && (
                <span className="text-xs font-normal text-black/60 md:hidden truncate max-w-[200px]">
                  {resumeLabel}
                </span>
              )}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

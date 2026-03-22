'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, ChevronDown, Zap } from 'lucide-react'
import type { PlanItem } from '@/server/routers/studyPlan'
import type { DashboardV1Props } from './DashboardV1'

function getPlanHref(item: PlanItem | undefined): string {
  if (!item?.workspaceId) return '/dashboard'
  if (item.type === 'flashcard_review') return `/workspace/${item.workspaceId}?tab=flashcards`
  if (item.type === 'lesson') return `/workspace/${item.workspaceId}/lesson/${item.resourceId}`
  return `/workspace/${item.workspaceId}`
}

const INITIAL_VISIBLE = 3

function PlanItemList({ pendingItems }: { pendingItems: PlanItem[] }) {
  const [expanded, setExpanded] = useState(false)
  const visibleItems = expanded ? pendingItems : pendingItems.slice(0, INITIAL_VISIBLE)
  const hiddenCount = pendingItems.length - INITIAL_VISIBLE

  return (
    <div className="space-y-3">
      {visibleItems.map((item, index) => {
        const href = getPlanHref(item)
        const isFirst = index === 0
        const isFlashcard = item.type === 'flashcard_review'

        return (
          <Link
            key={`${item.workspaceId ?? 'global'}-${item.resourceId ?? index}-${item.type}`}
            href={href}
            className={`group relative overflow-hidden rounded-xl border transition-colors ${
              isFirst
                ? 'border-border bg-gradient-to-r from-primary/10 to-transparent'
                : 'border-border bg-card hover:border-primary/30'
            }`}
          >
            {/* Desktop layout */}
            <div className="hidden md:flex items-center gap-4 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted">
                <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/40" />
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div
                  className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    isFlashcard
                      ? 'bg-red-500/10 text-red-600 dark:text-red-300'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  {isFlashcard ? 'Review' : 'Lesson'}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3
                    className={`font-medium text-foreground ${isFirst ? 'sm:truncate' : 'truncate'}`}
                  >
                    {item.title ?? (isFlashcard ? 'Flashcard Review' : 'Lesson')}
                  </h3>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    ~{item.estimatedMinutes} min
                  </span>
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {item.reason ??
                    (isFlashcard ? 'Cards ready for review' : 'Pick up where you left off')}
                </p>
              </div>
              {isFirst ? (
                <span className="shrink-0 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black">
                  Start Now
                </span>
              ) : (
                <span className="shrink-0 text-sm font-medium text-primary">Open</span>
              )}
            </div>

            {/* Mobile layout */}
            <div className="md:hidden p-3">
              <h3 className="line-clamp-1 font-medium text-sm text-foreground">
                {item.title ?? (isFlashcard ? 'Flashcard Review' : 'Lesson')}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <div
                  className={`rounded-lg px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    isFlashcard
                      ? 'bg-red-500/10 text-red-600 dark:text-red-300'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  {isFlashcard ? 'Review' : 'Lesson'}
                </div>
                <span className="text-xs text-muted-foreground">~{item.estimatedMinutes}min</span>
                <span className="truncate text-xs text-muted-foreground">
                  {item.reason ??
                    (isFlashcard ? 'Cards ready for review' : 'Pick up where you left off')}
                </span>
              </div>
            </div>
          </Link>
        )
      })}
      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          {expanded ? 'Show less' : `See ${hiddenCount} more`}
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  )
}

type PlanSectionProps = Pick<
  DashboardV1Props,
  'pendingItems' | 'totalMinutes' | 'totalPlanItems' | 'completedCount'
>

export function PlanSection({
  pendingItems,
  totalMinutes,
  totalPlanItems,
  completedCount,
}: PlanSectionProps) {
  return (
    <section className="w-full rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-foreground">Learning Engine</h2>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                Today
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {totalPlanItems} actions &bull; ~{totalMinutes} min
            </p>
          </div>
        </div>
        <div className="rounded-full border border-border bg-muted px-3 py-1 text-sm font-semibold text-foreground">
          {completedCount}/{totalPlanItems}
        </div>
      </div>

      {pendingItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <p className="font-medium text-foreground">All caught up</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Great work. There is nothing left in today&apos;s queue.
          </p>
        </div>
      ) : (
        <PlanItemList pendingItems={pendingItems} />
      )}
    </section>
  )
}

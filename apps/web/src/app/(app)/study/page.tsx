'use client'

import Link from 'next/link'
import { trpc } from '@/lib/trpc/client'
import { Topbar } from '@/components/layout/Topbar'

function ReadinessMeter({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color = score >= 0.8 ? 'bg-green-500' : score >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Exam Readiness</span>
        <span className="font-semibold tabular-nums">{pct}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className={['h-full rounded-full transition-all', color].join(' ')}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Exam readiness: ${pct}%`}
        />
      </div>
    </div>
  )
}

function PlanItemIcon({ type }: { type: string }) {
  if (type === 'flashcard_review') {
    return (
      <svg
        className="h-5 w-5 text-blue-500"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M8 12h8M12 8v8" />
      </svg>
    )
  }
  if (type === 'lesson') {
    return (
      <svg
        className="h-5 w-5 text-purple-500"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    )
  }
  return (
    <svg
      className="h-5 w-5 text-muted-foreground"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4l3 3" />
    </svg>
  )
}

function getItemHref(item: {
  type: string
  resourceId: string
  resourceType: string
  workspaceId?: string
}): string {
  if (item.type === 'flashcard_review') return '/dashboard'
  if (item.type === 'lesson') {
    const wsId = item.workspaceId
    if (wsId) return `/workspace/${wsId}/lesson/${item.resourceId}`
    return '/dashboard'
  }
  return '/dashboard'
}

function getItemLabel(item: { type: string }): string {
  if (item.type === 'flashcard_review') return 'Review due flashcards'
  if (item.type === 'lesson') return 'Continue lesson'
  return 'Study item'
}

function StudyQueueContent() {
  const { data: plan, isLoading, error } = trpc.studyPlan.getToday.useQuery({})
  const markCompleteMutation = trpc.studyPlan.markItemComplete.useMutation()

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        Failed to load study plan. Please try again.
      </div>
    )
  }

  const items = plan?.items ?? []
  const examDate = plan?.examDate
  const readinessScore = plan?.readinessScore

  // Calculate days until exam
  let examDaysRemaining: number | null = null
  if (examDate) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const exam = new Date(examDate)
    examDaysRemaining = Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="space-y-6">
      {/* Exam prep section */}
      {examDate && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          {examDaysRemaining !== null && (
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-orange-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span className="text-sm font-medium">
                {examDaysRemaining > 0
                  ? `${examDaysRemaining} day${examDaysRemaining === 1 ? '' : 's'} until your exam`
                  : examDaysRemaining === 0
                    ? 'Your exam is today!'
                    : 'Exam has passed'}
              </span>
            </div>
          )}
          {readinessScore != null && <ReadinessMeter score={readinessScore} />}
        </div>
      )}

      {/* Today's plan */}
      <div>
        <h2 className="mb-3 text-base font-semibold">
          Today&apos;s Plan
          {items.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({items.filter((i) => i.completed).length}/{items.length} done)
            </span>
          )}
        </h2>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-12 text-center">
            <svg
              className="h-10 w-10 text-muted-foreground"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <p className="text-sm text-muted-foreground">All caught up! Nothing due today.</p>
            <Link href="/dashboard" className="text-sm text-primary hover:underline">
              Browse your workspaces
            </Link>
          </div>
        ) : (
          <ul className="space-y-2" role="list">
            {items.map((item, i) => (
              <li
                key={i}
                className={[
                  'flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors',
                  item.completed ? 'opacity-60' : '',
                ].join(' ')}
              >
                <PlanItemIcon type={item.type} />
                <div className="flex-1 min-w-0">
                  <p
                    className={[
                      'text-sm font-medium',
                      item.completed ? 'line-through text-muted-foreground' : '',
                    ].join(' ')}
                  >
                    {getItemLabel(item)}
                  </p>
                  <p className="text-xs text-muted-foreground">~{item.estimatedMinutes} min</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!item.completed && (
                    <Link
                      href={getItemHref(item)}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-opacity"
                      aria-label={`Start: ${getItemLabel(item)}`}
                    >
                      Start
                    </Link>
                  )}
                  <button
                    onClick={() =>
                      plan?.id && markCompleteMutation.mutate({ planId: plan.id, itemIndex: i })
                    }
                    disabled={item.completed || markCompleteMutation.isPending}
                    className={[
                      'h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors',
                      item.completed
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-muted-foreground hover:border-primary',
                    ].join(' ')}
                    aria-label={item.completed ? 'Completed' : 'Mark as complete'}
                  >
                    {item.completed && (
                      <svg
                        className="h-3 w-3"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        aria-hidden="true"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default function StudyPage() {
  return (
    <>
      <Topbar title="Study Queue" />
      <div className="flex-1 p-6">
        <div className="mx-auto max-w-2xl">
          <StudyQueueContent />
        </div>
      </div>
    </>
  )
}

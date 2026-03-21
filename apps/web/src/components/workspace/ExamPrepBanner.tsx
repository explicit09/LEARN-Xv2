'use client'

import Link from 'next/link'
import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'

interface ExamPrepBannerProps {
  workspaceId: string
}

export function ExamPrepBanner({ workspaceId }: ExamPrepBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  const { data: plan } = trpc.studyPlan.getToday.useQuery({ workspaceId })
  const setExamDateMutation = trpc.studyPlan.setExamDate.useMutation()
  const [showDateInput, setShowDateInput] = useState(false)
  const [dateValue, setDateValue] = useState('')

  if (dismissed) return null

  const examDate = plan?.examDate
  const readinessScore = plan?.readinessScore

  // Calculate days remaining
  let daysRemaining: number | null = null
  if (examDate) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const exam = new Date(examDate)
    daysRemaining = Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (daysRemaining < 0) return null // Past exam, don't show
  }

  if (!examDate && !showDateInput) {
    return (
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 dark:border-orange-800 dark:bg-orange-950">
        <svg
          className="h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <p className="flex-1 text-sm text-orange-700 dark:text-orange-300">
          Have an upcoming exam? Set a target date to get a readiness score.
        </p>
        <button
          onClick={() => setShowDateInput(true)}
          className="shrink-0 rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 transition-colors"
          aria-label="Set exam date"
        >
          Set date
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 text-orange-500 hover:text-orange-700 transition-colors"
          aria-label="Dismiss exam prep banner"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    )
  }

  if (showDateInput) {
    return (
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 dark:border-orange-800 dark:bg-orange-950">
        <label
          htmlFor="exam-date-input"
          className="text-sm text-orange-700 dark:text-orange-300 shrink-0"
        >
          Exam date:
        </label>
        <input
          id="exam-date-input"
          type="date"
          value={dateValue}
          onChange={(e) => setDateValue(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          className="rounded-md border border-orange-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-orange-900"
          aria-label="Select exam date"
        />
        <button
          onClick={() => {
            if (dateValue) {
              setExamDateMutation.mutate({ examDate: dateValue, workspaceId })
              setShowDateInput(false)
            }
          }}
          disabled={!dateValue || setExamDateMutation.isPending}
          className="shrink-0 rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50 transition-colors"
          aria-label="Confirm exam date"
        >
          Set
        </button>
        <button
          onClick={() => setShowDateInput(false)}
          className="shrink-0 text-orange-500 hover:text-orange-700 transition-colors"
          aria-label="Cancel"
        >
          Cancel
        </button>
      </div>
    )
  }

  // Exam date is set
  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950">
      <svg
        className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400"
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
      <div className="flex-1 text-sm text-blue-700 dark:text-blue-300">
        <span className="font-medium">
          {daysRemaining === 0
            ? 'Exam today!'
            : daysRemaining === 1
              ? '1 day until exam'
              : `${daysRemaining} days until exam`}
        </span>
        {readinessScore != null && (
          <span className="ml-2 text-blue-600 dark:text-blue-400">
            — {Math.round(readinessScore * 100)}% ready
          </span>
        )}
      </div>
      <Link
        href="/dashboard"
        className="shrink-0 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
        aria-label="View study queue"
      >
        Study queue
      </Link>
    </div>
  )
}

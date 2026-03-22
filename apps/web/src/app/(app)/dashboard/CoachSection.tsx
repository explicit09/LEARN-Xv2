'use client'

import { AlertTriangle, MessageCircle, Target, Zap } from 'lucide-react'
import type { CoachMessage } from '@/lib/study-plan/types'
import type { DashboardV1Props } from './DashboardV1'

type CoachSectionProps = Pick<
  DashboardV1Props,
  | 'pendingItems'
  | 'completedCount'
  | 'totalPlanItems'
  | 'examDate'
  | 'readinessScore'
  | 'coachMessage'
  | 'coachAiMessage'
>

export function CoachSection({
  completedCount,
  totalPlanItems,
  pendingItems,
  examDate,
  readinessScore,
  coachMessage,
  coachAiMessage,
}: CoachSectionProps) {
  const copy: CoachMessage = coachMessage
  const allCompleted = totalPlanItems > 0 && completedCount >= totalPlanItems
  const isRecovery = copy.tone === 'orange' && pendingItems.length > 0

  let examDaysRemaining: number | null = null
  if (examDate) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    examDaysRemaining = Math.ceil((new Date(examDate).getTime() - today.getTime()) / 86_400_000)
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm">
      {/* Exam countdown */}
      {examDate && examDaysRemaining !== null && examDaysRemaining >= 0 && (
        <div className="mb-4 rounded-xl border border-orange-200 dark:border-orange-500/20 bg-orange-50 dark:bg-orange-500/10 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-orange-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className="text-sm font-semibold text-orange-800 dark:text-orange-300">
              {examDaysRemaining === 0
                ? 'Exam is today!'
                : `${examDaysRemaining} day${examDaysRemaining === 1 ? '' : 's'} until exam`}
            </span>
          </div>
          {readinessScore != null && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-orange-700 dark:text-orange-400">Readiness</span>
                <span className="font-semibold text-orange-800 dark:text-orange-300">
                  {Math.round(readinessScore * 100)}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-orange-200 dark:bg-orange-900/40">
                <div
                  className={`h-full rounded-full transition-all ${readinessScore >= 0.8 ? 'bg-green-500' : readinessScore >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.round(readinessScore * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={
              isRecovery
                ? 'p-2 rounded-xl bg-orange-100 dark:bg-orange-500/10'
                : 'p-2 rounded-xl bg-cyan-100 dark:bg-cyan-500/10'
            }
          >
            {isRecovery ? (
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            ) : (
              <Target className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-foreground">
              {isRecovery ? 'Recovery Mode' : 'Your Coach'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isRecovery ? 'Catching up on reviews' : 'Personalized guidance'}
            </p>
          </div>
        </div>
      </div>

      {isRecovery && (
        <div className="mb-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20">
          <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
            Reviews are due first
          </p>
          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
            Clear the due queue before starting something new.
          </p>
        </div>
      )}

      {/* AI Coach Message (heartbeat-driven) */}
      {coachAiMessage && (
        <div className="relative rounded-xl border overflow-hidden border-primary/20 bg-primary/5">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
          <div className="relative p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5 text-primary">
                <Zap className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wider text-primary/70 font-bold mb-1.5">
                  AI Coach
                </p>
                <p className="text-sm leading-relaxed text-foreground">{coachAiMessage}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rule-based status card */}
      <div
        className={`relative rounded-xl border overflow-hidden ${
          allCompleted
            ? 'border-green-200 dark:border-green-500/20 bg-green-50 dark:bg-green-500/10'
            : 'border-border bg-card'
        }`}
      >
        <div
          className={`absolute inset-0 bg-gradient-to-r pointer-events-none ${
            allCompleted
              ? 'from-green-500/20 to-transparent'
              : copy.tone === 'orange'
                ? 'from-orange-500/20 to-transparent'
                : copy.tone === 'emerald'
                  ? 'from-emerald-500/20 to-transparent'
                  : copy.tone === 'red'
                    ? 'from-red-500/20 to-transparent'
                    : 'from-blue-500/20 to-transparent'
          }`}
        />
        <div className="relative p-4">
          <div className="flex items-start gap-3">
            <div
              className={`flex-shrink-0 mt-0.5 ${
                allCompleted
                  ? 'text-green-500 dark:text-green-400'
                  : copy.tone === 'orange'
                    ? 'text-orange-600 dark:text-orange-400'
                    : copy.tone === 'emerald'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : copy.tone === 'red'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-blue-600 dark:text-blue-400'
              }`}
            >
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">
                {copy.eyebrow}
              </p>
              <p className="text-sm font-medium text-foreground">{copy.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{copy.body}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

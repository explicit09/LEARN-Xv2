'use client'

import Link from 'next/link'
import { trpc } from '@/lib/trpc/client'

interface MasteryDashboardProps {
  workspaceId: string
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-gray-200 p-4">
      <p className="truncate text-xs text-gray-500">{label}</p>
      <p className="mt-1 truncate text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 truncate text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

export function MasteryDashboard({ workspaceId }: MasteryDashboardProps) {
  const { data: summary, isLoading: summaryLoading } = trpc.mastery.getWorkspaceSummary.useQuery({
    workspaceId,
  })
  const { data: weak } = trpc.mastery.getWeakConcepts.useQuery({ workspaceId })
  const { data: next } = trpc.mastery.getWhatToStudyNext.useQuery({ workspaceId })

  if (summaryLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  const masteryPct =
    summary && summary.totalConcepts > 0
      ? Math.round((summary.mastered / summary.totalConcepts) * 100)
      : 0

  return (
    <div className="space-y-8">
      {/* Summary stats */}
      <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Concepts" value={summary?.totalConcepts ?? 0} />
        <StatCard label="Mastered" value={summary?.mastered ?? 0} sub={`${masteryPct}% of total`} />
        <StatCard label="Struggling" value={summary?.struggling ?? 0} sub="high lapse rate" />
        <StatCard label="Due Reviews" value={summary?.dueReviews ?? 0} sub="flashcards" />
      </div>

      {/* What to study next */}
      {next && next.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">What to Study Next</h3>
          <div className="space-y-2">
            {next.map((item) => {
              const href =
                item.type === 'flashcard_set'
                  ? `/workspace/${workspaceId}/flashcards`
                  : `/workspace/${workspaceId}/lesson/${item.id}`
              return (
                <Link
                  key={item.id}
                  href={href}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.reason}</p>
                  </div>
                  <span className="text-xs text-blue-600">Start →</span>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Struggling concepts */}
      {weak && weak.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Struggling Concepts</h3>
          <div className="space-y-2">
            {weak.map((c) => {
              const stability = Math.min(Math.round((c.avg_stability / 100) * 100), 100)
              const color =
                stability >= 80 ? 'bg-green-500' : stability >= 40 ? 'bg-yellow-500' : 'bg-red-500'
              return (
                <div
                  key={c.concept_id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.concept_name}</p>
                    <p className="text-xs text-gray-500">
                      {c.card_count} cards · {Math.round(c.avg_lapses)} avg lapses
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-16 rounded-full bg-gray-100">
                      <div
                        className={`h-2 rounded-full ${color}`}
                        style={{ width: `${stability}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-xs text-gray-500">{stability}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {!weak?.length && !next?.length && (
        <div className="py-12 text-center text-gray-500">
          <p className="text-sm">No mastery data yet.</p>
          <p className="mt-1 text-xs text-gray-400">
            Complete lessons and review flashcards to track progress.
          </p>
        </div>
      )}
    </div>
  )
}

'use client'

import { Topbar } from '@/components/layout/Topbar'
import { trpc } from '@/lib/trpc/client'
import { BarChart3, BookOpen, BrainCircuit, Clock, Flame, GraduationCap } from 'lucide-react'

export default function AnalyticsPage() {
  const { data: dashboard, isLoading } = trpc.analytics.getDashboard.useQuery()
  const { data: heatmap } = trpc.analytics.getStudyHeatmap.useQuery({})

  return (
    <>
      <Topbar title="Analytics" />
      <div className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<Flame className="w-5 h-5 text-orange-500" />}
              label="Study Streak"
              value={isLoading ? '—' : `${dashboard?.studyStreak ?? 0} days`}
              bg="bg-orange-500/10"
            />
            <StatCard
              icon={<Clock className="w-5 h-5 text-blue-500" />}
              label="Total Study Time"
              value={isLoading ? '—' : `${dashboard?.totalStudyMinutes ?? 0} min`}
              bg="bg-blue-500/10"
            />
            <StatCard
              icon={<BrainCircuit className="w-5 h-5 text-emerald-500" />}
              label="Concepts Mastered"
              value={isLoading ? '—' : String(dashboard?.totalConceptsMastered ?? 0)}
              bg="bg-emerald-500/10"
            />
            <StatCard
              icon={<GraduationCap className="w-5 h-5 text-violet-500" />}
              label="Lessons Completed"
              value={isLoading ? '—' : String(dashboard?.totalLessonsCompleted ?? 0)}
              bg="bg-violet-500/10"
            />
          </div>

          {/* Study Heatmap */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
              <h2 className="font-bold">Study Activity</h2>
            </div>
            {heatmap && heatmap.length > 0 ? (
              <HeatmapGrid data={heatmap} />
            ) : (
              <p className="text-sm text-muted-foreground">
                No study activity yet. Complete lessons and review flashcards to see your heatmap.
              </p>
            )}
          </div>

          {/* Recent Workspaces */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-muted-foreground" />
              <h2 className="font-bold">Recent Workspaces</h2>
            </div>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-muted/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : dashboard?.recentWorkspaces?.length ? (
              <div className="space-y-2">
                {dashboard.recentWorkspaces.map((ws) => (
                  <a
                    key={ws.id}
                    href={`/workspace/${ws.id}`}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <span className="font-medium text-sm">{ws.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(ws.updatedAt).toLocaleDateString()}
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No workspaces yet.</p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function StatCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode
  label: string
  value: string
  bg: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div
        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}
      >
        {icon}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground font-medium mt-1">{label}</p>
    </div>
  )
}

function HeatmapGrid({ data }: { data: { date: string; minutes: number }[] }) {
  const maxMinutes = Math.max(...data.map((d) => d.minutes), 1)

  return (
    <div className="flex flex-wrap gap-1">
      {data.map((day) => {
        const intensity = Math.min(day.minutes / maxMinutes, 1)
        const opacity = 0.15 + intensity * 0.85
        return (
          <div
            key={day.date}
            className="w-3 h-3 rounded-sm"
            style={{
              backgroundColor: `rgba(59, 130, 246, ${opacity})`,
            }}
            title={`${day.date}: ${day.minutes} min`}
          />
        )
      })}
    </div>
  )
}

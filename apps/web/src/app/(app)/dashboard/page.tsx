import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { WorkspaceCard } from '@/components/workspace/WorkspaceCard'
import { CreateWorkspaceModal } from '@/components/workspace/CreateWorkspaceModal'
import { createServerCaller } from '@/lib/trpc/server'
import type { PlanItem } from '@/server/routers/studyPlan'
import {
  CheckCircle,
  Star,
  Clock,
  BookOpen,
  Sparkles,
} from 'lucide-react'
import { Button } from '@learn-x/ui'
import {
  StudyPlanItem,
  DueTodayItem,
  LearningEngineEmpty,
  DueTodayEmpty,
} from './DashboardPlanItems'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
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

  let studyPlan: { items: PlanItem[] } = { items: [] }
  try {
    studyPlan = await caller.studyPlan.getToday({})
  } catch {
    // Silently degrade — user may have no data yet
  }

  const hasWorkspaces = workspaces.length > 0
  const greeting = getGreeting()

  const dueCardCount = studyPlan.items.filter(
    (item) => item.type === 'flashcard_review',
  ).length
  const totalMinutes = studyPlan.items.reduce(
    (sum, item) => sum + (item.estimatedMinutes ?? 0),
    0,
  )
  const pendingItems = studyPlan.items.filter((item) => !item.completed)
  const completedCount = studyPlan.items.length - pendingItems.length

  return (
    <>
      <Topbar title="Dashboard" actions={<CreateWorkspaceModal />} />
      <div className="flex-1 overflow-auto p-4 md:p-8 flex flex-col gap-8 max-w-[1400px] mx-auto w-full">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
                {greeting}
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight uppercase text-foreground">
              {profile.display_name?.split(' ')[0] || 'LEARNER'}
            </h1>
            <p className="text-muted-foreground mt-2 font-medium">
              {hasWorkspaces
                ? `${workspaces.length} workspace${workspaces.length === 1 ? '' : 's'} active`
                : 'Welcome back — upload your first document to get started'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="glass bg-transparent border-border hover:bg-muted/50 rounded-xl px-6 font-medium h-11"
            >
              View Progress
            </Button>
            <Button className="rounded-xl px-8 font-semibold shadow-[0_0_20px_rgba(37,99,235,0.4)] h-11">
              Continue <span className="ml-2">→</span>
            </Button>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
          <div className="glass-card rounded-2xl p-5 flex flex-col justify-center border-t border-t-white/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-500">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold tracking-tight">{dueCardCount}</span>
                  <span className="text-muted-foreground text-sm font-medium">cards due</span>
                </div>
                {dueCardCount === 0 ? (
                  <div className="text-emerald-500 text-xs font-semibold mt-0.5">All caught up!</div>
                ) : (
                  <div className="text-muted-foreground text-xs mt-0.5">Today&apos;s review queue</div>
                )}
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 flex flex-col justify-center border-t border-t-white/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-500">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold tracking-tight">{completedCount}</span>
                  <span className="text-muted-foreground text-sm font-medium">done today</span>
                </div>
                <div className="text-muted-foreground text-xs mt-0.5">
                  of {studyPlan.items.length} planned
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 flex flex-col justify-center border-t border-t-white/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 text-yellow-500">
                <Star className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold tracking-tight">{workspaces.length}</span>
                  <span className="text-muted-foreground text-sm font-medium">workspaces</span>
                </div>
                <div className="text-muted-foreground text-xs mt-0.5">
                  {hasWorkspaces ? 'Active' : 'None yet'}
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 flex flex-col justify-center border-t border-t-white/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold tracking-tight">{totalMinutes}</span>
                  <span className="text-muted-foreground text-sm font-medium">min today</span>
                </div>
                <div className="text-muted-foreground text-xs mt-0.5">Estimated session</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-[1fr_380px] gap-6 mt-4">

          {/* Left Column */}
          <div className="space-y-6">

            {/* Learning Engine */}
            <div className="glass-card rounded-3xl border border-border p-5 md:p-6 overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold">Learning Engine</h2>
                      <span className="bg-emerald-500/10 text-emerald-500 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm border border-emerald-500/20">
                        {greeting}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {pendingItems.length > 0
                        ? `${pendingItems.length} action${pendingItems.length === 1 ? '' : 's'} · ~${totalMinutes} min`
                        : 'Nothing pending — great work!'}
                    </p>
                  </div>
                </div>
                <div className="text-sm font-semibold text-muted-foreground bg-muted px-3 py-1 rounded-lg">
                  {completedCount}/{studyPlan.items.length}
                </div>
              </div>

              {pendingItems.length === 0 ? (
                <LearningEngineEmpty hasWorkspaces={hasWorkspaces} />
              ) : (
                <div className="space-y-3">
                  {pendingItems.map((item, idx) => (
                    <StudyPlanItem key={idx} item={item} />
                  ))}
                </div>
              )}
            </div>

            {/* Active Workspaces */}
            <div className="pt-4">
              <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-lg font-bold">Active Workspaces</h2>
                <Button variant="link" className="text-muted-foreground hover:text-foreground">
                  View All →
                </Button>
              </div>

              {workspaces.length === 0 ? (
                <div className="glass-card rounded-3xl border border-dashed border-border p-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted mx-auto flex items-center justify-center mb-4">
                    <BookOpen className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold">No workspaces yet</h3>
                  <p className="text-muted-foreground mt-1 mb-6">
                    Create a workspace to start uploading and mastering your course materials.
                  </p>
                  <CreateWorkspaceModal />
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {workspaces.map((ws) => (
                    <WorkspaceCard
                      key={ws.id}
                      id={ws.id}
                      name={ws.name}
                      description={ws.description}
                      status={ws.status}
                      totalTokenCount={ws.total_token_count}
                      updatedAt={ws.updated_at as string | null}
                      createdAt={ws.created_at as string | null}
                    />
                  ))}
                  <CreateWorkspaceModal />
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">

            {/* Coach Panel */}
            <div className="glass-card rounded-3xl border border-border p-5">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold">Your Coach</h3>
                  <p className="text-xs text-muted-foreground">Personalized guidance</p>
                </div>
              </div>

              {!hasWorkspaces ? (
                <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4 mb-4">
                  <p className="text-[10px] font-bold tracking-wider text-primary uppercase mb-1">
                    Get started
                  </p>
                  <h4 className="text-xl font-bold mb-2">Upload your first document</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Create a workspace and upload your course materials to get personalized coaching,
                    flashcards, and a study plan tailored to you.
                  </p>
                </div>
              ) : dueCardCount > 0 ? (
                <div className="rounded-2xl bg-orange-950/40 border border-orange-500/20 p-4 mb-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 blur-2xl rounded-full -mr-8 -mt-8" />
                  <div className="relative z-10">
                    <p className="text-[10px] font-bold tracking-wider text-orange-500 uppercase mb-1">
                      Review due
                    </p>
                    <h4 className="text-xl font-bold text-orange-50 md:text-2xl mb-2">
                      {dueCardCount} card{dueCardCount === 1 ? '' : 's'} waiting
                    </h4>
                    <p className="text-sm text-orange-200/70 leading-relaxed">
                      Keep your retention high — review now before the material fades.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-emerald-950/40 border border-emerald-500/20 p-4 mb-4">
                  <p className="text-[10px] font-bold tracking-wider text-emerald-500 uppercase mb-1">
                    On track
                  </p>
                  <h4 className="text-xl font-bold text-emerald-50 mb-2">Nothing due today</h4>
                  <p className="text-sm text-emerald-200/70 leading-relaxed">
                    You&apos;re ahead of your schedule. Consider reviewing a new lesson.
                  </p>
                </div>
              )}

              <div className="rounded-2xl bg-card border border-border p-4 relative overflow-hidden">
                <div className="absolute top-4 left-4 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <div className="pl-6">
                  <h5 className="font-semibold text-sm mb-1">Coaching tip</h5>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {hasWorkspaces
                      ? 'Consistent daily review — even 10 minutes — dramatically improves long-term retention.'
                      : 'Start with a subject you are actively studying. Upload your syllabus or lecture slides to get an instant study plan.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Due Today */}
            <div className="glass-card rounded-3xl border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Due Today</h3>
                {pendingItems.length > 0 && (
                  <Button
                    size="sm"
                    className="h-8 text-xs font-semibold rounded-lg bg-primary/20 text-primary hover:bg-primary/30 border border-primary/20 shadow-none"
                  >
                    Study Now
                  </Button>
                )}
              </div>

              {pendingItems.length === 0 ? (
                <DueTodayEmpty hasWorkspaces={hasWorkspaces} />
              ) : (
                <div className="space-y-3">
                  {pendingItems.slice(0, 5).map((item, idx) => (
                    <DueTodayItem key={idx} item={item} index={idx} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

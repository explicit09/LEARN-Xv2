import Link from 'next/link'
import type { PlanItem } from '@/server/routers/studyPlan'
import { BookOpen, AlertCircle, Brain, Calendar } from 'lucide-react'
import { Button } from '@learn-x/ui'
import { CreateWorkspaceModal } from '@/components/workspace/CreateWorkspaceModal'

const ITEM_COLORS = ['bg-primary', 'bg-purple-500', 'bg-yellow-500', 'bg-emerald-500', 'bg-red-500']

function getPlanHref(item: PlanItem): string | null {
  if (!item.workspaceId) return '/dashboard'
  if (item.type === 'flashcard_review') return `/workspace/${item.workspaceId}/flashcards`
  if (item.type === 'lesson') return `/workspace/${item.workspaceId}/lesson/${item.resourceId}`
  return `/workspace/${item.workspaceId}`
}

export function StudyPlanItem({ item }: { item: PlanItem }) {
  const isFlashcard = item.type === 'flashcard_review'
  const isLesson = item.type === 'lesson'
  const href = getPlanHref(item)

  const label = isFlashcard ? 'Review' : isLesson ? 'Lesson' : 'Study'
  const title = isFlashcard
    ? 'Flashcard Review'
    : item.resourceId
      ? 'Continue lesson'
      : 'Study session'

  const accentClass = isFlashcard
    ? 'surface-panel-subtle border-red-500/20 hover:border-red-500/30'
    : 'surface-panel-subtle hover:border-primary/30'
  const labelClass = isFlashcard ? 'bg-red-500 text-white' : 'bg-primary text-primary-foreground'
  const barClass = isFlashcard ? 'bg-red-500' : 'bg-primary'
  const Icon = isLesson ? BookOpen : isFlashcard ? AlertCircle : Brain

  const content = (
    <div
      className={`surface-card-hover group flex items-center justify-between rounded-[22px] p-4 ${accentClass} relative overflow-hidden transition-colors`}
    >
      {isFlashcard && (
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${barClass} rounded-l-2xl`} />
      )}
      <div className="flex items-center gap-4 pl-2">
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full border ${isFlashcard ? 'border-red-500/30' : 'border-border'}`}
        />
        <div
          className={`w-8 h-8 rounded-lg ${isFlashcard ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'} flex items-center justify-center`}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${labelClass}`}
            >
              {label}
            </span>
            <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
            <span className="text-xs text-muted-foreground">~{item.estimatedMinutes} min</span>
          </div>
          <p
            className={`mt-0.5 text-sm ${isFlashcard ? 'font-medium text-red-600 dark:text-red-300' : 'text-muted-foreground'}`}
          >
            {isFlashcard ? 'Cards ready for review' : 'Pick up where you left off'}
          </p>
        </div>
      </div>
      {isFlashcard && (
        <Button
          asChild={Boolean(href)}
          variant="outline"
          className="bg-white text-black hover:bg-white/90 rounded-lg h-9 px-5 border-0 font-semibold shadow-lg"
        >
          {href ? <Link href={href}>Start Now</Link> : 'Start Now'}
        </Button>
      )}
    </div>
  )

  if (!href) return content

  return <Link href={href}>{content}</Link>
}

export function DueTodayItem({ item, index }: { item: PlanItem; index: number }) {
  const color = ITEM_COLORS[index % ITEM_COLORS.length]
  const label = item.type === 'flashcard_review' ? 'Flashcard Review' : 'Lesson'
  const subLabel = item.workspaceId ? 'Workspace study' : 'Due today'

  const href = getPlanHref(item)
  const content = (
    <div className="surface-panel-subtle surface-card-hover flex cursor-pointer items-center justify-between rounded-xl p-3 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <div>
          <h4 className="text-sm font-semibold text-foreground">{label}</h4>
          <p className="text-xs text-muted-foreground">{subLabel}</p>
        </div>
      </div>
      <span className="text-xs font-bold text-muted-foreground">~{item.estimatedMinutes} min</span>
    </div>
  )

  if (!href) return content

  return <Link href={href}>{content}</Link>
}

export function LearningEngineEmpty({ hasWorkspaces }: { hasWorkspaces: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
      <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
        <Brain className="w-6 h-6" />
      </div>
      <div>
        <h3 className="font-semibold">
          {hasWorkspaces ? "You're all caught up for today!" : 'No tasks yet'}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {hasWorkspaces
            ? 'Check back tomorrow for your next study session.'
            : 'Create a workspace to get started.'}
        </p>
      </div>
      {!hasWorkspaces && <CreateWorkspaceModal />}
    </div>
  )
}

export function DueTodayEmpty({ hasWorkspaces }: { hasWorkspaces: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
      <Calendar className="w-8 h-8 text-muted-foreground" />
      <p className="text-sm font-medium">No cards due today</p>
      <p className="text-xs text-muted-foreground">
        {hasWorkspaces
          ? 'Check back tomorrow for your next review.'
          : 'Create a workspace to generate your first flashcards.'}
      </p>
    </div>
  )
}

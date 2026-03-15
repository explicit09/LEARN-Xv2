'use client'

import { trpc } from '@/lib/trpc/client'
import { LessonCard } from './LessonCard'

interface LessonListProps {
  workspaceId: string
}

export function LessonList({ workspaceId }: LessonListProps) {
  const { data: lessons, isLoading, refetch } = trpc.lesson.list.useQuery({ workspaceId })
  const triggerGenerate = trpc.lesson.triggerGenerate.useMutation({
    onSuccess: () => setTimeout(() => refetch(), 2000),
  })

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (!lessons || lessons.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center space-y-3">
        <p className="text-sm text-muted-foreground">No lessons yet.</p>
        <p className="text-xs text-muted-foreground">
          Generate lessons from your concepts to start learning.
        </p>
        <button
          onClick={() => triggerGenerate.mutate({ workspaceId })}
          disabled={triggerGenerate.isPending}
          className="px-4 py-2 text-sm font-medium rounded-md bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors"
        >
          {triggerGenerate.isPending ? 'Generating…' : 'Generate Lessons'}
        </button>
      </div>
    )
  }

  const completed = lessons.filter((l) => l.is_completed).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {completed}/{lessons.length} completed
        </p>
        <button
          onClick={() => triggerGenerate.mutate({ workspaceId })}
          disabled={triggerGenerate.isPending}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {triggerGenerate.isPending ? 'Regenerating…' : 'Regenerate'}
        </button>
      </div>
      <div className="space-y-2">
        {lessons.map((lesson) => (
          <LessonCard
            key={lesson.id as string}
            id={lesson.id as string}
            workspaceId={workspaceId}
            title={lesson.title as string}
            orderIndex={lesson.order_index as number}
            summary={lesson.summary as string | null}
            isCompleted={lesson.is_completed as boolean}
          />
        ))}
      </div>
    </div>
  )
}

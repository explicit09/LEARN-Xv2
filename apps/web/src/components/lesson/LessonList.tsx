'use client'

import { trpc } from '@/lib/trpc/client'
import { LessonCard } from './LessonCard'
import { GraduationCap, Sparkles, RefreshCw } from 'lucide-react'
import { Button } from '@learn-x/ui'

interface LessonListProps {
  workspaceId: string
}

export function LessonList({ workspaceId }: LessonListProps) {
  const {
    data: lessons,
    isLoading,
    refetch,
  } = trpc.lesson.list.useQuery(
    { workspaceId },
    {
      refetchInterval: (query) => {
        const data = query.state.data
        return !data || data.length === 0 ? 5000 : false
      },
    },
  )
  const triggerGenerate = trpc.lesson.triggerGenerate.useMutation({
    onSuccess: () => setTimeout(() => refetch(), 2000),
  })

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-2xl bg-muted/50 border border-border animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (!lessons || lessons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center rounded-3xl border border-dashed border-border/50 bg-card/20 backdrop-blur-sm m-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 shadow-inner border border-primary/20">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Ready to Learn?</h2>
        <p className="text-muted-foreground max-w-sm mb-8">
          We&apos;ll use your extracted concepts to generate personalized, pedagogical lessons.
        </p>
        <Button
          size="lg"
          onClick={() => triggerGenerate.mutate({ workspaceId })}
          disabled={triggerGenerate.isPending}
          className="rounded-xl px-8 font-bold shadow-[0_0_20px_rgba(37,99,235,0.4)]"
        >
          {triggerGenerate.isPending ? 'Generating Lessons...' : 'Generate New Lessons'}
          <Sparkles className="ml-2 w-4 h-4" />
        </Button>
      </div>
    )
  }

  const completed = lessons.filter((l) => l.is_completed).length
  const progressPercent = Math.round((completed / Math.max(1, lessons.length)) * 100)

  return (
    <div className="space-y-6 p-4">
      {/* Progress Header */}
      <div className="flex items-center justify-between glass-card p-5 border border-border/50 rounded-2xl">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
            <span className="font-black text-sm text-primary">{progressPercent}%</span>
          </div>
          <div className="flex-1 max-w-md">
            <div className="flex justify-between items-end mb-1">
              <span className="text-sm font-bold">Course Progress</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {completed} of {lessons.length}
              </span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-1000"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => triggerGenerate.mutate({ workspaceId })}
          disabled={triggerGenerate.isPending}
          className="shrink-0 rounded-xl h-10 border-border/50 ml-4 hidden sm:flex"
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${triggerGenerate.isPending ? 'animate-spin' : ''}`}
          />
          {triggerGenerate.isPending ? 'Regenerating...' : 'Regenerate'}
        </Button>
      </div>

      {/* List */}
      <div className="space-y-3">
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

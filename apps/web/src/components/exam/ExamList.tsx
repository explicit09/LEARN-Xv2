'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { ClipboardCheck, Sparkles, ChevronRight, GraduationCap, ArrowLeft } from 'lucide-react'
import { Button } from '@learn-x/ui'
import { ExamRunner } from './ExamRunner'

interface ExamListProps {
  workspaceId: string
}

export function ExamList({ workspaceId }: ExamListProps) {
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null)
  const utils = trpc.useUtils()
  const { data: exams, isLoading } = trpc.exam.list.useQuery({ workspaceId })
  const generateMutation = trpc.exam.generate.useMutation({
    onSuccess: () => void utils.exam.list.invalidate({ workspaceId }),
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-2xl bg-muted/50 border border-border"
          />
        ))}
      </div>
    )
  }

  if (!exams?.length) {
    return (
      <div className="py-8 sm:py-12 px-4 flex flex-col items-center justify-center text-center rounded-2xl sm:rounded-3xl border border-dashed border-border/50 bg-card/20 backdrop-blur-sm">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-6 shadow-inner border border-indigo-500/20">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold mb-2">No exams yet</h2>
        <p className="mt-1 text-muted-foreground max-w-sm mb-8">
          Generate timed assessments with Bloom&apos;s-tagged questions.
        </p>
        <Button
          onClick={() => generateMutation.mutate({ workspaceId })}
          disabled={generateMutation.isPending}
          size="lg"
          className="rounded-xl px-8 font-bold shadow-[0_0_20px_rgba(99,102,241,0.3)] bg-indigo-600 hover:bg-indigo-700 text-white border-0"
        >
          {generateMutation.isPending ? 'Starting...' : 'Generate Exam'}
          <Sparkles className="ml-2 w-4 h-4" />
        </Button>
        {generateMutation.isSuccess && (
          <p className="mt-4 text-xs text-muted-foreground animate-pulse">
            Exam generation started. It will appear shortly.
          </p>
        )}
      </div>
    )
  }

  if (selectedExamId) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setSelectedExamId(null)}
          className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to exams
        </button>
        <ExamRunner examId={selectedExamId} workspaceId={workspaceId} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between glass-card p-3 sm:p-4 rounded-2xl border border-border/50 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20 shrink-0">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-foreground text-sm sm:text-base">Available Exams</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {exams.length} Total
            </p>
          </div>
        </div>
        <Button
          onClick={() => generateMutation.mutate({ workspaceId })}
          disabled={generateMutation.isPending}
          variant="outline"
          className="rounded-xl border-border/50"
        >
          {generateMutation.isPending ? 'Generating…' : 'Generate New'}
          <Sparkles className="ml-2 w-4 h-4 text-indigo-500" />
        </Button>
      </div>

      <div className="space-y-3">
        {exams.map((exam) => (
          <button
            key={exam.id}
            type="button"
            onClick={() => setSelectedExamId(exam.id as string)}
            className="w-full flex items-center justify-between rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm p-3 sm:p-4 hover:bg-card/80 hover:border-indigo-500/30 transition-all group shadow-sm text-left"
          >
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="mt-1 w-10 h-10 shrink-0 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:text-indigo-500 group-hover:bg-indigo-500/10 transition-colors border shadow-inner">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-foreground text-sm sm:text-lg mb-0.5 truncate group-hover:text-indigo-500 transition-colors">
                  {exam.title ?? 'Untitled Exam'}
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      exam.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : exam.status === 'closed'
                          ? 'bg-red-500/10 text-red-500'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {exam.status}
                  </span>
                  {exam.time_limit_minutes && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                      {exam.time_limit_minutes} min
                    </span>
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                    {new Date(exam.created_at as string).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="shrink-0 w-8 h-8 rounded-lg bg-indigo-500/10 hidden sm:flex items-center justify-center text-indigo-500 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all ml-4 border border-indigo-500/20">
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { trpc } from '@/lib/trpc/client'
import { Flame, Sparkles, ChevronRight, ActivitySquare } from 'lucide-react'
import { Button } from '@learn-x/ui'

interface QuizListProps {
  workspaceId: string
}

export function QuizList({ workspaceId }: QuizListProps) {
  const utils = trpc.useUtils()
  const { data: quizzes, isLoading } = trpc.quiz.list.useQuery({ workspaceId })
  const generate = trpc.quiz.generate.useMutation({
    onSuccess: () => void utils.quiz.list.invalidate({ workspaceId }),
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted/50 border border-border" />
        ))}
      </div>
    )
  }

  if (!quizzes?.length) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center rounded-3xl border border-dashed border-border/50 bg-card/20 backdrop-blur-sm">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 mb-6 shadow-inner border border-orange-500/20">
           <Flame className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold mb-2">No active quizzes</h2>
        <p className="mt-1 text-muted-foreground max-w-sm mb-8">
          Generate interactive quizzes automatically from your lessons and core concepts to test your knowledge.
        </p>
        <Button
          onClick={() => generate.mutate({ workspaceId })}
          disabled={generate.isPending}
          size="lg"
          className="rounded-xl px-8 font-bold shadow-[0_0_20px_rgba(249,115,22,0.3)] bg-orange-600 hover:bg-orange-700 text-white border-0"
        >
          {generate.isPending ? 'Starting Engine...' : 'Generate Quizzes'}
          <Sparkles className="ml-2 w-4 h-4" />
        </Button>
        {generate.isSuccess && (
          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
            Quiz generation scheduled.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Header Actions */}
      <div className="flex items-center justify-between glass-card p-4 rounded-2xl border border-border/50">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20">
             <ActivitySquare className="w-5 h-5" />
           </div>
           <div>
             <p className="font-bold text-foreground">Available Quizzes</p>
             <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
               {quizzes.length} Total
             </p>
           </div>
        </div>

        <Button
          onClick={() => generate.mutate({ workspaceId })}
          disabled={generate.isPending}
          variant="outline"
          className="rounded-xl border-border/50"
        >
          {generate.isPending ? 'Generating…' : 'Generate New'}
          <Sparkles className="ml-2 w-4 h-4 text-orange-500" />
        </Button>
      </div>

      {generate.isSuccess && (
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20 w-fit">Generation started. Check back shortly.</p>
      )}
      <div className="space-y-3">
        {quizzes.map((quiz) => (
          <Link
            key={quiz.id}
            href={`/workspace/${workspaceId}/quiz/${quiz.id}`}
            className="flex items-center justify-between rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm p-4 hover:bg-card/80 hover:border-orange-500/30 transition-all group shadow-sm"
          >
            <div className="flex items-start gap-4 flex-1 min-w-0">
               <div className="mt-1 w-10 h-10 shrink-0 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:text-orange-500 group-hover:bg-orange-500/10 transition-colors border shadow-inner">
                 <Flame className="w-5 h-5" />
               </div>
               <div className="min-w-0">
                 <p className="font-bold text-foreground text-lg mb-0.5 truncate group-hover:text-orange-500 transition-colors">{quiz.title ?? 'Untitled Quiz'}</p>
                 <div className="flex items-center gap-2">
                   <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                     {(quiz.quiz_type as string)?.replace('_', ' ')}
                   </p>
                   <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                     {new Date(quiz.created_at as string).toLocaleDateString()}
                   </span>
                 </div>
               </div>
            </div>
            <div className="shrink-0 w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all ml-4 border border-orange-500/20">
               <ChevronRight className="w-4 h-4" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { trpc } from '@/lib/trpc/client'
import { ChevronRight, Sparkles, Layers } from 'lucide-react'
import { Button } from '@learn-x/ui'

interface FlashcardSetListProps {
  workspaceId: string
}

export function FlashcardSetList({ workspaceId }: FlashcardSetListProps) {
  const utils = trpc.useUtils()
  const { data: sets, isLoading } = trpc.flashcard.listSets.useQuery({ workspaceId })
  const generate = trpc.flashcard.generate.useMutation({
    onSuccess: () => void utils.flashcard.listSets.invalidate({ workspaceId }),
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted/50 border border-border" />
        ))}
      </div>
    )
  }

  if (!sets?.length) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-border/50 bg-card/20 backdrop-blur-sm">
        <Layers className="w-12 h-12 text-muted-foreground/30 mb-4" />
        <p className="text-lg font-bold text-foreground">No flashcard sets yet.</p>
        <p className="mt-2 text-muted-foreground max-w-sm mb-6">
          Generate flashcards intelligently from your lessons and core concepts.
        </p>
        <Button
          onClick={() => generate.mutate({ workspaceId })}
          disabled={generate.isPending}
          className="rounded-xl px-6 font-bold"
        >
          {generate.isPending ? 'Starting Generation...' : 'Generate Flashcards'}
          <Sparkles className="ml-2 w-4 h-4" />
        </Button>
        {generate.isSuccess && (
          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
            Generation started!
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sets.map((set) => (
        <Link
          key={set.id}
          href={`/workspace/${workspaceId}/flashcards/${set.id}`}
          className="flex items-center justify-between rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm hover:bg-card/80 p-4 transition-all hover:border-primary/30 group shadow-sm"
        >
          <div className="flex items-start gap-3">
             <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10 text-primary">
               <Layers className="w-5 h-5" />
             </div>
             <div>
               <p className="font-bold text-foreground group-hover:text-primary transition-colors">{set.title}</p>
               <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                 {new Date(set.created_at as string).toLocaleDateString()}
               </span>
             </div>
          </div>
          <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all border border-primary/20">
             <ChevronRight className="w-4 h-4" />
          </div>
        </Link>
      ))}
    </div>
  )
}

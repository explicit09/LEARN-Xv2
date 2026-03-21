'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { FlashcardCard } from './FlashcardCard'
import { CalendarCheck2, ActivitySquare } from 'lucide-react'

interface FlashcardReviewProps {
  workspaceId: string
}

export function FlashcardReview({ workspaceId }: FlashcardReviewProps) {
  const utils = trpc.useUtils()
  const { data: due, isLoading } = trpc.flashcard.getDue.useQuery({ workspaceId })
  const submitReview = trpc.flashcard.submitReview.useMutation({
    onSuccess: () => {
      void utils.flashcard.getDue.invalidate({ workspaceId })
    },
  })
  const [rawIndex, setRawIndex] = useState(0)

  // Derive a safe index: clamp to valid range whenever `due` changes length
  const index = !due?.length ? 0 : Math.min(rawIndex, due.length - 1)

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-3xl bg-muted/50 border border-border" />
  }

  if (!due?.length) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl border border-dashed border-border/50 bg-card/20 backdrop-blur-sm">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-6 shadow-inner border border-emerald-500/20">
          <CalendarCheck2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Caught up for now.</h2>
        <p className="text-muted-foreground max-w-sm">
          You have no cards due for review! Check back later or generate more flashcard sets.
        </p>
      </div>
    )
  }

  const card = due[index]
  if (!card) return null

  const progressPercent = Math.round((index / Math.max(1, due.length)) * 100)

  async function handleRate(rating: 1 | 2 | 3 | 4) {
    await submitReview.mutateAsync({ cardId: (card as { id: string }).id, rating })
    if (index + 1 < (due?.length ?? 0)) {
      setRawIndex((i) => i + 1)
    } else {
      setRawIndex(0)
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress Track */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center gap-1.5 text-primary">
            <ActivitySquare className="w-4 h-4" />
            Reviewing
          </span>
          <span>
            {index + 1} of {due.length} due
          </span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <FlashcardCard
        front={(card as { front: string }).front}
        back={(card as { back: string }).back}
        onRate={handleRate}
        isSubmitting={submitReview.isPending}
      />
    </div>
  )
}

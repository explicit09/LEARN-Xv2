'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { FlashcardCard } from './FlashcardCard'
import { CalendarCheck2, ActivitySquare, CheckCircle2, RotateCcw } from 'lucide-react'

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
  const [reviewed, setReviewed] = useState(0)
  const [finished, setFinished] = useState(false)

  const total = due?.length ?? 0
  const index = !total ? 0 : Math.min(rawIndex, total - 1)

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-3xl bg-muted/50 border border-border" />
  }

  if (!total || finished) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl border border-dashed border-border/50 bg-card/20 backdrop-blur-sm">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-6 shadow-inner border border-emerald-500/20">
          {finished ? <CheckCircle2 className="w-8 h-8" /> : <CalendarCheck2 className="w-8 h-8" />}
        </div>
        <h2 className="text-2xl font-bold mb-2">
          {finished
            ? `${reviewed} card${reviewed === 1 ? '' : 's'} reviewed`
            : 'Caught up for now.'}
        </h2>
        <p className="text-muted-foreground max-w-sm">
          {finished
            ? 'Nice work! Come back later when more cards are due.'
            : 'You have no cards due for review! Check back later or generate more flashcard sets.'}
        </p>
        {finished && (
          <button
            onClick={() => {
              setFinished(false)
              setRawIndex(0)
              setReviewed(0)
              void utils.flashcard.getDue.invalidate({ workspaceId })
            }}
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <RotateCcw className="w-4 h-4" />
            Check for more
          </button>
        )}
      </div>
    )
  }

  const card = due[index]
  if (!card) return null

  const progressPercent = Math.round((rawIndex / Math.max(1, total)) * 100)

  async function handleRate(rating: 1 | 2 | 3 | 4) {
    await submitReview.mutateAsync({ cardId: (card as { id: string }).id, rating })
    setReviewed((r) => r + 1)
    if (rawIndex + 1 < total) {
      setRawIndex((i) => i + 1)
    } else {
      setFinished(true)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center gap-1.5 text-primary">
            <ActivitySquare className="w-4 h-4" />
            Reviewing
          </span>
          <span>
            {rawIndex + 1} of {total} due
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

'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { FlashcardCard } from './FlashcardCard'

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
  const [index, setIndex] = useState(0)

  if (isLoading) {
    return <div className="h-48 animate-pulse rounded-xl bg-gray-100" />
  }

  if (!due?.length) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p className="text-sm font-medium">No cards due for review.</p>
        <p className="mt-1 text-xs text-gray-400">Check back later or add more documents.</p>
      </div>
    )
  }

  const card = due[index]
  if (!card) return null

  async function handleRate(rating: 1 | 2 | 3 | 4) {
    await submitReview.mutateAsync({ cardId: (card as { id: string }).id, rating })
    if (index + 1 < (due?.length ?? 0)) {
      setIndex((i) => i + 1)
    } else {
      setIndex(0)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {index + 1} / {due.length} due
        </span>
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

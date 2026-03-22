'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { ChevronRight, Sparkles, Layers, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@learn-x/ui'
import { FlashcardReview } from './FlashcardReview'

interface FlashcardSetListProps {
  workspaceId: string
}

export function FlashcardSetList({ workspaceId }: FlashcardSetListProps) {
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null)
  const utils = trpc.useUtils()
  const generate = trpc.flashcard.generate.useMutation({
    onSuccess: () => void utils.flashcard.listSets.invalidate({ workspaceId }),
  })
  // Poll while generating
  const { data: sets, isLoading } = trpc.flashcard.listSets.useQuery(
    { workspaceId },
    { refetchInterval: generate.isPending || generate.isSuccess ? 3000 : false },
  )

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
          disabled={generate.isPending || generate.isSuccess}
          className="rounded-xl px-6 font-bold"
        >
          {generate.isPending ? (
            <>
              <Loader2 className="mr-2 w-4 h-4 animate-spin" />
              Starting...
            </>
          ) : generate.isSuccess ? (
            <>
              <Loader2 className="mr-2 w-4 h-4 animate-spin" />
              Generating flashcards...
            </>
          ) : (
            <>
              Generate Flashcards
              <Sparkles className="ml-2 w-4 h-4" />
            </>
          )}
        </Button>
        {generate.isSuccess && (
          <p className="mt-4 text-xs text-muted-foreground animate-pulse">
            This usually takes 30-60 seconds. Cards will appear automatically.
          </p>
        )}
      </div>
    )
  }

  if (selectedSetId) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setSelectedSetId(null)}
          className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sets
        </button>
        <FlashcardSetView setId={selectedSetId} workspaceId={workspaceId} />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sets.map((set: { id: string; title: string; created_at: string }) => (
        <button
          type="button"
          key={set.id}
          onClick={() => setSelectedSetId(set.id)}
          className="flex w-full items-center justify-between rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm hover:bg-card/80 p-3 sm:p-4 transition-all hover:border-primary/30 group shadow-sm cursor-pointer text-left"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10 text-primary">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-foreground group-hover:text-primary transition-colors">
                {set.title}
              </p>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {new Date(set.created_at as string).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 hidden sm:flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all border border-primary/20">
            <ChevronRight className="w-4 h-4" />
          </div>
        </button>
      ))}
    </div>
  )
}

const RATINGS: Array<{ value: 1 | 2 | 3 | 4; label: string; colorClass: string }> = [
  { value: 1, label: 'Again', colorClass: 'border-red-500/50 text-red-500 hover:bg-red-500/10' },
  {
    value: 2,
    label: 'Hard',
    colorClass: 'border-amber-500/50 text-amber-500 hover:bg-amber-500/10',
  },
  {
    value: 3,
    label: 'Good',
    colorClass: 'border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10',
  },
  { value: 4, label: 'Easy', colorClass: 'border-blue-500/50 text-blue-500 hover:bg-blue-500/10' },
]

/** View all cards in a set with flip + FSRS rating */
function FlashcardSetView({ setId, workspaceId }: { setId: string; workspaceId: string }) {
  const utils = trpc.useUtils()
  const { data, isLoading } = trpc.flashcard.getSet.useQuery({ id: setId, workspaceId })
  const submitReview = trpc.flashcard.submitReview.useMutation({
    onSuccess: () => {
      void utils.flashcard.getDue.invalidate({ workspaceId })
    },
  })
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-3xl bg-muted/50 border border-border" />
  }

  const cards = (data?.cards ?? []) as { id: string; front: string; back: string }[]
  if (!cards.length) {
    return <p className="text-center text-muted-foreground py-8">No cards in this set.</p>
  }

  const card = cards[currentIndex]!
  const total = cards.length

  function handleRate(rating: 1 | 2 | 3 | 4) {
    submitReview.mutate({ cardId: card.id, rating })
    setFlipped(false)
    if (currentIndex + 1 < total) {
      setCurrentIndex((i) => i + 1)
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-full sm:max-w-2xl mx-auto">
      <h2 className="text-lg font-bold">{data?.title}</h2>
      <p className="text-xs text-muted-foreground">
        {currentIndex + 1} / {total}
      </p>

      {/* Card */}
      <div
        onClick={() => !flipped && setFlipped(true)}
        className="w-full min-h-[35vh] sm:min-h-[40vh] md:min-h-[250px] perspective-1000 cursor-pointer"
      >
        <div
          className={`relative w-full min-h-[35vh] sm:min-h-[40vh] md:min-h-[250px] preserve-3d transition-transform duration-500 ease-spring ${flipped ? 'rotate-y-180' : ''}`}
        >
          <div className="absolute inset-0 backface-hidden rounded-3xl border border-border bg-card p-4 sm:p-8 flex items-center justify-center text-center">
            <p className="text-base sm:text-lg font-semibold text-foreground break-words">
              {card.front}
            </p>
          </div>
          <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-3xl border border-primary/30 bg-primary/5 p-4 sm:p-8 flex items-center justify-center text-center">
            <p className="text-sm sm:text-base text-foreground break-words">{card.back}</p>
          </div>
        </div>
      </div>

      {/* Rating or hint */}
      {!flipped ? (
        <p className="text-xs text-muted-foreground animate-pulse">Click card to reveal answer</p>
      ) : (
        <div className="grid grid-cols-4 gap-2 sm:gap-3 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300">
          {RATINGS.map((r) => (
            <button
              key={r.value}
              onClick={(e) => {
                e.stopPropagation()
                handleRate(r.value)
              }}
              disabled={submitReview.isPending}
              className={`rounded-xl border-2 px-3 py-3 text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-50 ${r.colorClass}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => {
            setCurrentIndex(Math.max(0, currentIndex - 1))
            setFlipped(false)
          }}
          disabled={currentIndex === 0}
          className="rounded-xl"
        >
          Previous
        </Button>
        <Button
          onClick={() => {
            setCurrentIndex(Math.min(total - 1, currentIndex + 1))
            setFlipped(false)
          }}
          disabled={currentIndex === total - 1}
          className="rounded-xl"
        >
          Next
        </Button>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { Star, X } from 'lucide-react'
import { Button } from '@learn-x/ui'

interface LessonRatingDialogProps {
  lessonId: string
  lessonTitle: string
  workspaceId: string
  open: boolean
  onClose: () => void
}

const EMOJIS = ['', '😞', '😐', '🙂', '😊', '🤩']

export function LessonRatingDialog({
  lessonId,
  lessonTitle,
  workspaceId,
  open,
  onClose,
}: LessonRatingDialogProps) {
  const [rating, setRating] = useState(0)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [feedbackText, setFeedbackText] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const submitRating = trpc.lesson.submitRating.useMutation({
    onSuccess: () => {
      setSubmitted(true)
      setTimeout(onClose, 1500)
    },
  })

  if (!open) return null

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
          <div className="text-4xl mb-3">{EMOJIS[rating] || '🎉'}</div>
          <p className="font-bold text-lg">Thanks for the feedback!</p>
          <p className="text-sm text-muted-foreground mt-1">
            Your rating helps us improve lessons.
          </p>
        </div>
      </div>
    )
  }

  const displayRating = hoveredStar || rating
  const needsFeedback = rating > 0 && rating < 4

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base">How was this lesson?</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4 line-clamp-1">{lessonTitle}</p>

        {/* Stars */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star
                className={`w-8 h-8 transition-colors ${
                  star <= displayRating
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-muted-foreground/30'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Emoji indicator */}
        {displayRating > 0 && <p className="text-center text-2xl mb-4">{EMOJIS[displayRating]}</p>}

        {/* Feedback textarea */}
        {rating > 0 && (
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder={
              needsFeedback
                ? 'What could be improved? (required)'
                : 'Any additional thoughts? (optional)'
            }
            rows={3}
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none mb-4"
          />
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">
            Skip
          </Button>
          <Button
            onClick={() =>
              submitRating.mutate({
                lessonId,
                workspaceId,
                rating,
                feedbackText: feedbackText.trim() || undefined,
              })
            }
            disabled={
              rating === 0 || (needsFeedback && !feedbackText.trim()) || submitRating.isPending
            }
            className="flex-1 rounded-xl"
          >
            {submitRating.isPending ? 'Sending...' : 'Submit'}
          </Button>
        </div>
      </div>
    </div>
  )
}

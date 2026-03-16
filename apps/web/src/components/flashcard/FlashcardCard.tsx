'use client'

import { useState } from 'react'

interface FlashcardCardProps {
  front: string
  back: string
  onRate: (rating: 1 | 2 | 3 | 4) => void
  isSubmitting?: boolean
}

const RATINGS: Array<{ value: 1 | 2 | 3 | 4; label: string; color: string }> = [
  { value: 1, label: 'Again', color: 'border-red-200 text-red-700 hover:bg-red-50' },
  { value: 2, label: 'Hard', color: 'border-orange-200 text-orange-700 hover:bg-orange-50' },
  { value: 3, label: 'Good', color: 'border-green-200 text-green-700 hover:bg-green-50' },
  { value: 4, label: 'Easy', color: 'border-blue-200 text-blue-700 hover:bg-blue-50' },
]

export function FlashcardCard({ front, back, onRate, isSubmitting }: FlashcardCardProps) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div className="space-y-4">
      <button
        onClick={() => setFlipped((f) => !f)}
        className="w-full rounded-xl border border-gray-200 bg-white p-8 text-left shadow-sm hover:border-gray-300 transition-colors min-h-[160px] flex items-center justify-center"
      >
        <p className="text-base text-gray-900 text-center">{flipped ? back : front}</p>
      </button>

      {!flipped ? (
        <p className="text-center text-xs text-gray-400">Click to reveal answer</p>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {RATINGS.map((r) => (
            <button
              key={r.value}
              onClick={() => onRate(r.value)}
              disabled={isSubmitting}
              className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${r.color}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

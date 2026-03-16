'use client'

import { useState } from 'react'

interface FlashcardCardProps {
  front: string
  back: string
  onRate: (rating: 1 | 2 | 3 | 4) => void
  isSubmitting?: boolean
}

const RATINGS: Array<{ value: 1 | 2 | 3 | 4; label: string; colorClass: string }> = [
  { value: 1, label: 'Again', colorClass: 'border-red-500/50 text-red-500 hover:bg-red-500/10 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]' },
  { value: 2, label: 'Hard', colorClass: 'border-amber-500/50 text-amber-500 hover:bg-amber-500/10 hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]' },
  { value: 3, label: 'Good', colorClass: 'border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]' },
  { value: 4, label: 'Easy', colorClass: 'border-blue-500/50 text-blue-500 hover:bg-blue-500/10 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]' },
]

export function FlashcardCard({ front, back, onRate, isSubmitting }: FlashcardCardProps) {
  const [flipped, setFlipped] = useState(false)

  const handleRate = (val: 1|2|3|4) => {
    onRate(val)
    setFlipped(false)
  }

  return (
    <div className="space-y-6">
      
      {/* 3D Flip Container */}
      <div 
        className="relative w-full aspect-[4/3] sm:aspect-[16/9] md:aspect-[2/1] perspective-1000 cursor-pointer group"
        onClick={() => !flipped && setFlipped(true)}
      >
        <div 
          className={`w-full h-full relative preserve-3d transition-transform duration-700 ease-spring ${flipped ? 'rotate-y-180' : ''}`}
        >
          {/* Front */}
          <div className="absolute inset-0 backface-hidden glass-card rounded-3xl border border-border/50 p-6 md:p-10 flex flex-col items-center justify-center text-center shadow-lg group-hover:border-primary/50 transition-colors">
            <div className="absolute top-4 left-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">Front</div>
            <p className="text-xl md:text-3xl font-black text-foreground leading-tight px-4">{front}</p>
            <div className="absolute bottom-6 mx-auto text-xs font-bold uppercase tracking-wider text-primary opacity-0 group-hover:opacity-100 transition-opacity animate-pulse">
              Click to reveal
            </div>
          </div>

          {/* Back */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 glass-card bg-card/80 border border-primary/30 rounded-3xl p-6 md:p-10 flex flex-col items-center justify-center text-center shadow-lg shadow-primary/5">
            <div className="absolute inset-0 bg-primary/5 rounded-3xl mix-blend-overlay pointer-events-none" />
            <div className="absolute top-4 left-4 text-[10px] font-bold uppercase tracking-wider text-primary/50">Back</div>
            <p className="text-lg md:text-2xl font-semibold text-foreground leading-relaxed px-4">{back}</p>
          </div>
        </div>
      </div>

      {/* Action Row */}
      <div className="h-14">
        {!flipped ? (
           <p className="text-center text-sm font-bold text-muted-foreground animate-pulse mt-4">
             Think of the answer, then click the card to reveal.
           </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {RATINGS.map((r) => (
              <button
                key={r.value}
                onClick={(e) => {
                  e.stopPropagation()
                  handleRate(r.value)
                }}
                disabled={isSubmitting}
                className={`rounded-xl border-2 px-3 py-3 text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed ${r.colorClass}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>
      
    </div>
  )
}

import { Star } from 'lucide-react'

interface KeyTakeawayProps {
  points: string[]
}

export function KeyTakeaway({ points }: KeyTakeawayProps) {
  return (
    <div className="rounded-3xl border-2 border-primary/20 bg-primary/5 p-6 lg:p-8 space-y-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10" />
      <div className="relative z-10">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <Star className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-primary">
            Key Takeaways
          </h3>
        </div>
        <ul className="space-y-3">
          {points.map((point, i) => (
            <li key={i} className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span className="text-base text-foreground leading-relaxed">{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

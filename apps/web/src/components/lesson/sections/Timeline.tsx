import { Clock } from 'lucide-react'

interface TimelineProps {
  title: string
  events: { date: string; label: string; description: string }[]
}

export function Timeline({ title, events }: TimelineProps) {
  return (
    <div className="rounded-3xl border border-border bg-card/60 backdrop-blur-xl p-6 lg:p-8 space-y-5">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
          <Clock className="w-4 h-4 text-amber-600" />
        </div>
        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </h3>
      </div>
      <div className="relative pl-8">
        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-amber-400 via-amber-300 to-amber-200/30 rounded-full" />
        <div className="space-y-6">
          {events.map((event, i) => (
            <div key={i} className="relative">
              <div className="absolute -left-8 top-1 w-[22px] h-[22px] rounded-full border-2 border-amber-400 bg-background flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
              </div>
              <div className="bg-muted/30 rounded-xl p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="text-xs font-mono font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded">
                    {event.date}
                  </span>
                  <span className="text-sm font-bold text-foreground">{event.label}</span>
                </div>
                {event.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{event.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

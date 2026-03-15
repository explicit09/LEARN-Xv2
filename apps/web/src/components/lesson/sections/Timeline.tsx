interface TimelineProps {
  title: string
  events: { date: string; label: string; description: string }[]
}

export function Timeline({ title, events }: TimelineProps) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      <div className="space-y-3">
        {events.map((event, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-2 h-2 rounded-full bg-foreground mt-1.5 flex-shrink-0" />
              {i < events.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
            </div>
            <div className="pb-3">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-mono text-muted-foreground">{event.date}</span>
                <span className="text-sm font-medium">{event.label}</span>
              </div>
              {event.description && (
                <p className="text-sm text-muted-foreground mt-0.5">{event.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

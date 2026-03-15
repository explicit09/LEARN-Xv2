interface KeyTakeawayProps {
  points: string[]
}

export function KeyTakeaway({ points }: KeyTakeawayProps) {
  return (
    <div className="rounded-lg border border-border bg-foreground/5 p-4 space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Key Takeaways
      </h3>
      <ul className="space-y-1">
        {points.map((point, i) => (
          <li key={i} className="flex gap-2 text-sm">
            <span className="text-foreground/40 font-medium mt-0.5">{i + 1}.</span>
            <span className="text-foreground/90">{point}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

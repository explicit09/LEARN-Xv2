interface AnalogyCardProps {
  concept: string
  analogy: string
  mapping: { abstract: string; familiar: string }[]
}

export function AnalogyCard({ concept, analogy, mapping }: AnalogyCardProps) {
  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <span className="text-xs uppercase tracking-wide">Analogy</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded bg-muted/50 p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">Abstract</p>
          <p className="text-sm font-semibold">{concept}</p>
        </div>
        <div className="rounded bg-muted/50 p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">Like</p>
          <p className="text-sm font-semibold">{analogy}</p>
        </div>
      </div>
      {mapping.length > 0 && (
        <div className="space-y-1">
          {mapping.map((m, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">{m.abstract}</span>
              <span>→</span>
              <span>{m.familiar}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

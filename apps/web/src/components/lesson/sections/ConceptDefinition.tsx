interface ConceptDefinitionProps {
  term: string
  definition: string
  analogy?: string
  etymology?: string
}

export function ConceptDefinition({
  term,
  definition,
  analogy,
  etymology,
}: ConceptDefinitionProps) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
      <h3 className="font-semibold text-base text-foreground">{term}</h3>
      <p className="text-sm text-foreground/90 leading-relaxed">{definition}</p>
      {analogy && (
        <p className="text-sm text-muted-foreground italic border-l-2 border-accent pl-3">
          {analogy}
        </p>
      )}
      {etymology && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Etymology:</span> {etymology}
        </p>
      )}
    </div>
  )
}

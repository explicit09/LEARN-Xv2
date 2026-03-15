interface ConceptBridgeProps {
  from: string
  to: string
  relation: 'prerequisite' | 'extends' | 'related'
  explanation: string
}

const RELATION_LABELS: Record<ConceptBridgeProps['relation'], string> = {
  prerequisite: 'is required for',
  extends: 'builds on',
  related: 'is related to',
}

export function ConceptBridge({ from, to, relation, explanation }: ConceptBridgeProps) {
  return (
    <div className="rounded-lg border border-border/60 p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <span className="font-medium bg-muted px-2 py-0.5 rounded">{from}</span>
        <span className="text-xs text-muted-foreground">{RELATION_LABELS[relation]}</span>
        <span className="font-medium bg-muted px-2 py-0.5 rounded">{to}</span>
      </div>
      <p className="text-xs text-muted-foreground">{explanation}</p>
    </div>
  )
}

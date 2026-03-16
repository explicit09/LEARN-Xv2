import { ArrowRight, Link2 } from 'lucide-react'

interface ConceptBridgeProps {
  from: string
  to: string
  relation: 'prerequisite' | 'extends' | 'related'
  explanation: string
}

const RELATION_CONFIG: Record<
  ConceptBridgeProps['relation'],
  { label: string; color: string; bg: string }
> = {
  prerequisite: { label: 'is required for', color: 'text-blue-600', bg: 'bg-blue-500/10 border-blue-500/20' },
  extends: { label: 'builds on', color: 'text-emerald-600', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  related: { label: 'is related to', color: 'text-violet-600', bg: 'bg-violet-500/10 border-violet-500/20' },
}

export function ConceptBridge({ from, to, relation, explanation }: ConceptBridgeProps) {
  const config = RELATION_CONFIG[relation]

  return (
    <div className={`rounded-2xl border p-5 space-y-3 ${config.bg}`}>
      <div className="flex items-center gap-2 mb-1">
        <Link2 className={`w-4 h-4 ${config.color}`} />
        <span className={`text-xs font-bold uppercase tracking-widest ${config.color}`}>
          Concept Connection
        </span>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="font-bold text-foreground bg-background/80 px-3 py-1.5 rounded-lg border border-border text-sm">
          {from}
        </span>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ArrowRight className={`w-4 h-4 ${config.color}`} />
          <span className="font-medium">{config.label}</span>
        </div>
        <span className="font-bold text-foreground bg-background/80 px-3 py-1.5 rounded-lg border border-border text-sm">
          {to}
        </span>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{explanation}</p>
    </div>
  )
}

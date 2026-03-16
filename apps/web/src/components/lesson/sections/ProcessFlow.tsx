import { ListOrdered } from 'lucide-react'

interface ProcessFlowProps {
  title: string
  steps: { label: string; description: string }[]
}

export function ProcessFlow({ title, steps }: ProcessFlowProps) {
  return (
    <div className="rounded-3xl border border-border bg-card/60 backdrop-blur-xl p-6 lg:p-8 space-y-5">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
          <ListOrdered className="w-4 h-4 text-indigo-500" />
        </div>
        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </h3>
      </div>
      <ol className="space-y-3 relative pl-1">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-4 group">
            <div className="flex flex-col items-center">
              <span className="shrink-0 w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600 text-sm font-bold flex items-center justify-center border-2 border-indigo-500/20 group-hover:bg-indigo-500/20 transition-colors">
                {i + 1}
              </span>
              {i < steps.length - 1 && (
                <div className="w-0.5 flex-1 bg-border mt-2 rounded-full" />
              )}
            </div>
            <div className="pb-4">
              <span className="font-semibold text-foreground">{step.label}</span>
              {step.description && (
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{step.description}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

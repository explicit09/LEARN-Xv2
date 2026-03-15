interface ProcessFlowProps {
  title: string
  steps: { label: string; description: string }[]
}

export function ProcessFlow({ title, steps }: ProcessFlowProps) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      <ol className="space-y-2">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            <div>
              <span className="font-medium text-sm">{step.label}</span>
              {step.description && (
                <p className="text-sm text-muted-foreground mt-0.5">{step.description}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

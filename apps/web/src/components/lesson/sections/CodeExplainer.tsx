interface CodeExplainerProps {
  language: string
  code: string
  annotations: { line: number; note: string }[]
}

export function CodeExplainer({ language, code, annotations }: CodeExplainerProps) {
  const lines = code.split('\n')
  const annotationMap = new Map(annotations.map((a) => [a.line, a.note]))

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border">
        <span className="text-xs font-mono text-muted-foreground">{language}</span>
      </div>
      <div className="font-mono text-xs overflow-x-auto">
        {lines.map((line, i) => {
          const lineNum = i + 1
          const note = annotationMap.get(lineNum)
          return (
            <div key={i} className={note ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''}>
              <div className="flex">
                <span className="select-none w-10 text-right pr-3 py-0.5 text-muted-foreground/40 border-r border-border flex-shrink-0">
                  {lineNum}
                </span>
                <span className="pl-3 py-0.5 text-foreground/90 whitespace-pre">{line}</span>
              </div>
              {note && (
                <div className="pl-13 pr-3 py-0.5 text-xs text-amber-700 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/30 border-l-2 border-amber-400 ml-10">
                  ↳ {note}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

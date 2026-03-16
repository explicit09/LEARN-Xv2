import { BookOpen, Tag } from 'lucide-react'

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
    <div className="rounded-3xl border border-border bg-card/60 backdrop-blur-xl p-6 lg:p-8 space-y-6 relative overflow-hidden group mb-8 shadow-sm">
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors duration-1000" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-2xl text-foreground tracking-tight">{term}</h3>
            <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Definition</span>
          </div>
        </div>

        <div className="pl-13 border-l-2 border-primary/20 ml-5 pl-8 py-1">
          <p className="text-lg md:text-xl text-foreground leading-relaxed font-medium">
            {definition}
          </p>

          {analogy && (
            <div className="mt-6 p-4 rounded-xl bg-muted/50 border border-border/50 text-base text-muted-foreground italic relative">
               <span className="font-semibold not-italic text-foreground mb-1 block">In other words:</span>
               &quot;{analogy}&quot;
            </div>
          )}

          {etymology && (
            <div className="mt-4 flex items-start gap-2 text-sm text-muted-foreground bg-background/50 rounded-lg p-3 border border-border/50">
              <Tag className="w-4 h-4 mt-0.5 shrink-0 text-primary/70" />
              <p>
                <span className="font-semibold text-foreground/80">Etymology:</span> {etymology}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { Zap, ArrowRight, Activity, Cpu } from 'lucide-react'

interface AnalogyCardProps {
  concept: string
  analogy: string
  mapping: { abstract: string; familiar: string }[]
}

export function AnalogyCard({ concept, analogy, mapping }: AnalogyCardProps) {
  return (
    <div className="rounded-3xl border border-border bg-card/40 backdrop-blur-2xl p-6 lg:p-8 space-y-8 relative overflow-hidden my-12 shadow-[0_8px_32px_-8px_rgba(37,99,235,0.1)] group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
      
      <div className="relative z-10">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20 shadow-inner">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-xl text-foreground tracking-tight">Making it click</h3>
            <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Mental Model</span>
          </div>
        </div>

        {/* Split Grid */}
        <div className="grid md:grid-cols-[1fr_auto_1fr] gap-6 items-center">
          
          {/* Abstract Side */}
          <div className="rounded-2xl bg-card border border-border p-6 relative overflow-hidden h-full flex flex-col justify-center">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4 text-primary" />
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">The Concept</p>
            </div>
            <p className="text-xl lg:text-2xl font-black text-foreground">{concept}</p>
          </div>

          {/* VS Divider */}
          <div className="hidden md:flex flex-col flex-1 items-center justify-center px-4">
             <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold italic border border-border shadow-sm">
               IS
             </div>
          </div>

          {/* Familiar Side */}
          <div className="rounded-2xl bg-card border border-border p-6 relative overflow-hidden h-full flex flex-col justify-center">
             <div className="absolute top-0 right-0 w-1 h-full bg-emerald-500" />
             <div className="flex items-center gap-2 mb-2">
               <Activity className="w-4 h-4 text-emerald-500" />
               <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">The Analogy</p>
             </div>
            <p className="text-xl lg:text-2xl font-black text-foreground">{analogy}</p>
          </div>

        </div>

        {/* Dynamic Mapping List */}
        {mapping.length > 0 && (
          <div className="mt-8 pt-8 border-t border-border/50">
            <p className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground mb-4 pl-2">How it maps</p>
            <div className="grid gap-3">
              {mapping.map((m, i) => (
                <div key={i} className="flex items-center gap-4 bg-muted/30 hover:bg-muted/60 transition-colors p-4 rounded-xl border border-border/50">
                  <div className="w-1/2 text-right">
                    <span className="font-bold text-sm md:text-base text-foreground">{m.abstract}</span>
                  </div>
                  <div className="w-8 shrink-0 flex justify-center text-primary/50">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                  <div className="w-1/2">
                    <span className="font-medium text-sm md:text-base text-muted-foreground">{m.familiar}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

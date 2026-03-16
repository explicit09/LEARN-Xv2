import Link from 'next/link'
import { CheckCircle2, Circle, ChevronRight } from 'lucide-react'

interface LessonCardProps {
  id: string
  workspaceId: string
  title: string
  orderIndex: number
  summary?: string | null
  isCompleted: boolean
}

export function LessonCard({
  id,
  workspaceId,
  title,
  orderIndex,
  summary,
  isCompleted,
}: LessonCardProps) {
  return (
    <Link
      href={`/workspace/${workspaceId}/lesson/${id}`}
      className={`block relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all group ${
        isCompleted 
          ? 'bg-card/40 border-border/50 hover:bg-card/80 backdrop-blur-md' 
          : 'bg-card/60 backdrop-blur-xl border-border/50 hover:border-primary/30 shadow-sm'
      }`}
    >
      <div className="flex items-center gap-4 sm:gap-6">
        
        {/* Status Indicator / Number */}
        <div className="shrink-0 flex items-center justify-center">
          {isCompleted ? (
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 shadow-inner">
               <CheckCircle2 className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground border border-border group-hover:border-primary/50 group-hover:text-primary transition-colors font-black">
               {orderIndex + 1}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-1">
             <h3 className={`text-lg font-bold truncate transition-colors ${isCompleted ? 'text-muted-foreground line-through decoration-muted-foreground/30' : 'text-foreground group-hover:text-primary'}`}>{title}</h3>
          </div>
          {summary && (
            <p className={`text-sm line-clamp-2 leading-relaxed ${isCompleted ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}>{summary}</p>
          )}
        </div>

        {/* Right Arrow */}
        <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isCompleted ? 'text-border group-hover:text-muted-foreground' : 'bg-primary/5 text-primary opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0'}`}>
           <ChevronRight className="w-5 h-5" />
        </div>
      </div>
      
      {/* Subtle completion background fade */}
      {isCompleted && (
        <div className="absolute inset-0 bg-emerald-500/5 mix-blend-overlay pointer-events-none" />
      )}
    </Link>
  )
}

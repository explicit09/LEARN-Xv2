'use client'

import Link from 'next/link'
import { trpc } from '@/lib/trpc/client'
import { ActivitySquare, BookOpen, AlertCircle, CalendarClock, ArrowRight, BrainCircuit } from 'lucide-react'

interface MasteryDashboardProps {
  workspaceId: string
}

function StatCard({ label, value, sub, icon: Icon, colorClass }: { label: string; value: string | number; sub?: string, icon: React.ElementType, colorClass: string }) {
  return (
    <div className="glass-card overflow-hidden rounded-2xl border border-border/50 p-5 relative group">
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl -mr-10 -mt-10 opacity-20 group-hover:opacity-40 transition-opacity ${colorClass.replace('text-', 'bg-')}`} />
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
           <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner ${colorClass.replace('text-', 'bg-').replace('500', '500/10')} ${colorClass} ${colorClass.replace('text-', 'border-').replace('500', '500/20')}`}>
             <Icon className="w-5 h-5" />
           </div>
        </div>
        <p className="text-3xl font-black text-foreground mb-1">{value}</p>
        <p className="text-sm font-bold text-foreground">{label}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  )
}

export function MasteryDashboard({ workspaceId }: MasteryDashboardProps) {
  const { data: summary, isLoading: summaryLoading } = trpc.mastery.getWorkspaceSummary.useQuery({
    workspaceId,
  })
  const { data: weak } = trpc.mastery.getWeakConcepts.useQuery({ workspaceId })
  const { data: next } = trpc.mastery.getWhatToStudyNext.useQuery({ workspaceId })

  if (summaryLoading) {
    return (
      <div className="space-y-8 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted/50 border border-border" />
          ))}
        </div>
      </div>
    )
  }

  const masteryPct =
    summary && summary.totalConcepts > 0
      ? Math.round((summary.mastered / summary.totalConcepts) * 100)
      : 0

  return (
    <div className="space-y-10 p-4">
      
      {/* Summary stats */}
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Concepts" value={summary?.totalConcepts ?? 0} icon={BookOpen} colorClass="text-primary" />
        <StatCard label="Mastered" value={summary?.mastered ?? 0} sub={`${masteryPct}% of total`} icon={ActivitySquare} colorClass="text-emerald-500" />
        <StatCard label="Struggling" value={summary?.struggling ?? 0} sub="High lapse rate" icon={AlertCircle} colorClass="text-red-500" />
        <StatCard label="Due Reviews" value={summary?.dueReviews ?? 0} sub="Flashcards waiting" icon={CalendarClock} colorClass="text-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* What to study next */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
             <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
               <ArrowRight className="w-4 h-4" />
             </div>
             <h3 className="text-lg font-bold text-foreground">Up Next</h3>
          </div>
          
          {next && next.length > 0 ? (
            <div className="space-y-3">
              {next.map((item) => {
                const isFlashcard = item.type === 'flashcard_set'
                const href = isFlashcard
                    ? `/workspace/${workspaceId}/flashcards`
                    : `/workspace/${workspaceId}/lesson/${item.id}`
                    
                return (
                  <Link
                    key={item.id}
                    href={href}
                    className="flex items-center justify-between rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5 hover:border-primary/30 transition-all group shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center border shrink-0 ${isFlashcard ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-primary/10 text-primary border-primary/20'}`}>
                         {isFlashcard ? <ActivitySquare className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-base font-bold text-foreground group-hover:text-primary transition-colors">{item.title}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{item.reason}</p>
                      </div>
                    </div>
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/50 bg-card/20 p-8 text-center">
               <p className="text-muted-foreground">You&apos;re all caught up!</p>
            </div>
          )}
        </section>

        {/* Struggling concepts */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
             <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
               <BrainCircuit className="w-4 h-4" />
             </div>
             <h3 className="text-lg font-bold text-foreground">Struggling Concepts</h3>
          </div>
          
          {weak && weak.length > 0 ? (
            <div className="space-y-3">
              {weak.map((c) => {
                const stability = Math.min(Math.round((c.avg_stability / 100) * 100), 100)
                const color =
                  stability >= 80 ? 'bg-emerald-500' : stability >= 40 ? 'bg-amber-500' : 'bg-red-500'
                
                return (
                  <div
                    key={c.concept_id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5 shadow-sm"
                  >
                    <div>
                      <p className="text-base font-bold text-foreground mb-1">{c.concept_name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{c.card_count} cards</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">·</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{Math.round(c.avg_lapses)} avg lapses</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${color}`}
                          style={{ width: `${stability}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs font-bold font-mono">{stability}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
             <div className="rounded-2xl border border-dashed border-border/50 bg-card/20 p-8 text-center flex flex-col items-center">
               <ActivitySquare className="w-8 h-8 text-emerald-500/50 mb-3" />
               <p className="text-foreground font-semibold">No struggling concepts detected.</p>
               <p className="text-sm text-muted-foreground mt-1">Keep up the good work!</p>
             </div>
          )}
        </section>

      </div>
      
      {!summaryLoading && (!summary || summary.totalConcepts === 0) && (
        <div className="py-12 flex flex-col items-center justify-center text-center glass-card rounded-3xl border border-border/50 mt-8">
          <ActivitySquare className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-lg font-bold text-foreground">No mastery data yet.</p>
          <p className="mt-2 text-muted-foreground max-w-sm">
            Complete lessons and review flashcards to track your progress over time.
          </p>
        </div>
      )}
    </div>
  )
}

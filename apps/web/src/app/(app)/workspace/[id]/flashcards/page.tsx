import Link from 'next/link'
import { FlashcardReview } from '@/components/flashcard/FlashcardReview'
import { FlashcardSetList } from '@/components/flashcard/FlashcardSetList'
import { createServerCaller } from '@/lib/trpc/server'
import { ChevronLeft, Layers, CalendarClock } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function FlashcardsPage({ params }: Props) {
  const { id } = await params
  const caller = await createServerCaller()
  const workspace = await caller.workspace.get({ id }).catch(() => null)

  return (
    <div className="flex-1 overflow-auto p-4 md:p-8 flex flex-col gap-6 max-w-[1400px] mx-auto w-full">
      {/* Header */}
      <div className="space-y-4 mb-2">
        <Link
          href={`/workspace/${id}?tab=flashcards`}
          className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to workspace
        </Link>
        {workspace && (
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground">
            {workspace.name as string} <span className="text-muted-foreground/30">— Flashcards</span>
          </h1>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="glass-card rounded-3xl border border-border/50 p-6 md:p-8 shadow-sm h-fit">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-inner">
               <CalendarClock className="w-5 h-5" />
             </div>
             <h2 className="text-xl font-bold text-foreground">Due for Review</h2>
          </div>
          <FlashcardReview workspaceId={id} />
        </section>

        <section className="glass-card rounded-3xl border border-border/50 p-6 md:p-8 shadow-sm h-fit">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
               <Layers className="w-5 h-5" />
             </div>
             <h2 className="text-xl font-bold text-foreground">All Sets</h2>
          </div>
          <FlashcardSetList workspaceId={id} />
        </section>
      </div>
    </div>
  )
}

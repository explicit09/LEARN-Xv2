'use client'

import { trpc } from '@/lib/trpc/client'
import { BrainCircuit, Tag as TagIcon, ArrowRight } from 'lucide-react'

interface ConceptListProps {
  workspaceId: string
}

export function ConceptList({ workspaceId }: ConceptListProps) {
  const { data: concepts, isLoading } = trpc.concept.list.useQuery({ workspaceId })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted/50 border border-border" />
        ))}
      </div>
    )
  }

  if (!concepts?.length) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center rounded-3xl border border-dashed border-border/50 bg-card/20 backdrop-blur-sm m-4">
         <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 border border-primary/20 shadow-inner">
           <BrainCircuit className="w-8 h-8 opacity-80" />
         </div>
         <h2 className="text-2xl font-bold mb-2">No concepts extracted yet</h2>
         <p className="text-muted-foreground max-w-sm">
           The AI engine will automatically build a knowledge graph of core concepts once your documents finish processing.
         </p>
      </div>
    )
  }

  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {concepts.map((concept) => (
        <div 
          key={concept.id as string} 
          className="rounded-3xl border border-border/50 bg-card/60 backdrop-blur-xl p-6 hover:bg-card/80 transition-all group flex flex-col justify-between cursor-pointer"
        >
           <div>
              <div className="flex items-start justify-between mb-4">
                 <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20 shadow-inner">
                   <BrainCircuit className="w-5 h-5" />
                 </div>
                 <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <ArrowRight className="w-4 h-4 text-foreground" />
                 </div>
              </div>
              
              <h3 className="text-lg font-black text-foreground mb-2 line-clamp-1">{concept.name as string}</h3>
              
              <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed mb-6">
                 {(concept.description as string | null) ?? 'No description available for this concept.'}
              </p>
           </div>
           
           <div className="flex flex-wrap gap-2 mt-auto">
             {((concept.tags as string[]) ?? []).map((tag) => (
               <span
                 key={tag}
                 className="flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary"
               >
                 <TagIcon className="w-3 h-3" />
                 {tag}
               </span>
             ))}
           </div>
        </div>
      ))}
    </div>
  )
}

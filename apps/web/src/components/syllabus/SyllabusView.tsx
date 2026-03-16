'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { ChevronDown, ChevronUp, Map, Layers, Target } from 'lucide-react'

interface SyllabusViewProps {
  workspaceId: string
  hasDocuments: boolean
}

export function SyllabusView({ workspaceId, hasDocuments }: SyllabusViewProps) {
  const { data: syllabus, isLoading } = trpc.syllabus.get.useQuery({ workspaceId })
  const [openUnits, setOpenUnits] = useState<Set<string>>(new Set())

  function toggleUnit(unitId: string) {
    setOpenUnits((prev) => {
      const next = new Set(prev)
      if (next.has(unitId)) {
        next.delete(unitId)
      } else {
        next.add(unitId)
      }
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted/50 border border-border" />
        ))}
      </div>
    )
  }

  if (!syllabus) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center rounded-3xl border border-dashed border-border/50 bg-card/20 backdrop-blur-sm m-4">
         <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 border border-primary/20 shadow-inner">
           <Map className="w-8 h-8 opacity-80" />
         </div>
         <h2 className="text-2xl font-bold mb-2">
           {hasDocuments ? 'Building your roadmap...' : 'No syllabus yet'}
         </h2>
         <p className="text-muted-foreground max-w-sm">
           {hasDocuments
             ? 'The AI engine is synthesizing your documents into a structured learning syllabus. Check back shortly.'
             : 'Upload documents to generate an automated learning syllabus structured for mastery.'}
         </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      {syllabus.units.map((unit, index) => {
        const isOpen = openUnits.has(unit.id)
        return (
          <div key={unit.id} className="overflow-hidden rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm transition-all shadow-sm">
            <button
              onClick={() => toggleUnit(unit.id)}
              className={`flex w-full items-center justify-between px-6 py-5 text-left transition-colors ${isOpen ? 'bg-muted/30' : 'hover:bg-muted/40'}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black border border-primary/20 shrink-0">
                  {index + 1}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{unit.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-1 opacity-80 mt-0.5">
                    {unit.topics.length} {unit.topics.length === 1 ? 'topic' : 'topics'} in this unit
                  </p>
                </div>
              </div>
              <div className="shrink-0 w-8 h-8 rounded-full bg-background flex items-center justify-center border border-border shadow-sm text-muted-foreground group-hover:text-foreground">
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>
            {isOpen && (
              <div className="bg-background/50 backdrop-blur-md">
                {unit.topics.map((topic, i) => (
                  <div key={topic.id} className={`px-6 md:px-10 py-5 ${i !== unit.topics.length - 1 ? 'border-b border-border/50' : ''}`}>
                    <div className="flex items-start gap-4">
                      
                      <div className="mt-1 shrink-0">
                        <Layers className="w-5 h-5 text-muted-foreground/60" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-bold text-foreground mb-1">{topic.title}</p>
                        {topic.description && (
                          <p className="text-sm text-muted-foreground leading-relaxed mb-3 max-w-3xl">{topic.description}</p>
                        )}
                        
                        {topic.conceptNames.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground mr-2">
                              <Target className="w-3.5 h-3.5" /> Covered Concepts: 
                            </span>
                            {topic.conceptNames.map((name) => (
                              <span
                                key={name}
                                className="rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

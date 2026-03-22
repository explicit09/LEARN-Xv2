'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { ChevronDown, ChevronUp, Map, Layers, Target, BrainCircuit, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface SyllabusViewProps {
  workspaceId: string
  hasDocuments: boolean
}

export function SyllabusView({ workspaceId, hasDocuments }: SyllabusViewProps) {
  const { data: docs } = trpc.document.list.useQuery({ workspaceId })
  const hasProcessing = docs?.some((d) => ['uploading', 'processing'].includes(d.status as string))
  const { data: concepts } = trpc.concept.list.useQuery(
    { workspaceId },
    { refetchInterval: hasProcessing ? 5000 : false },
  )

  const { data: syllabus, isLoading } = trpc.syllabus.get.useQuery(
    { workspaceId },
    { refetchInterval: hasProcessing ? 5000 : false },
  )
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
          <div
            key={i}
            className="h-20 animate-pulse rounded-2xl bg-muted/50 border border-border"
          />
        ))}
      </div>
    )
  }

  if (!syllabus) {
    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-16 text-center rounded-3xl border border-dashed border-border/50 bg-card/20 backdrop-blur-sm m-4">
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
          <div
            key={unit.id}
            className="overflow-hidden rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm transition-all shadow-sm"
          >
            <button
              onClick={() => toggleUnit(unit.id)}
              className={`flex w-full items-center justify-between px-4 py-4 sm:px-6 sm:py-5 text-left transition-colors ${isOpen ? 'bg-muted/30' : 'hover:bg-muted/40'}`}
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black border border-primary/20 shrink-0 text-sm sm:text-base">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-foreground truncate">
                    {unit.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1 opacity-80 mt-0.5">
                    {unit.topics.length} {unit.topics.length === 1 ? 'topic' : 'topics'} in this
                    unit
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
                  <div
                    key={topic.id}
                    className={`px-4 sm:px-6 md:px-10 py-4 sm:py-5 ${i !== unit.topics.length - 1 ? 'border-b border-border/50' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-1 shrink-0">
                        <Layers className="w-5 h-5 text-muted-foreground/60" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-base font-bold text-foreground mb-1">{topic.title}</p>
                        {topic.description && (
                          <p className="text-sm text-muted-foreground leading-relaxed mb-3 max-w-3xl">
                            {topic.description}
                          </p>
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

      <section className="overflow-hidden rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
        <div className="flex flex-col gap-3 sm:gap-4 border-b border-border/50 px-4 py-4 sm:px-6 sm:py-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              Concepts
            </p>
            <h3 className="mt-2 text-xl font-bold text-foreground">Concept reference</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              A lightweight index of the concepts extracted from this workspace, kept below the
              syllabus instead of as a full separate section.
            </p>
          </div>
          {concepts && concepts.length > 0 ? (
            <Link
              href={`/workspace/${workspaceId}/graph`}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              Open Knowledge Graph
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>

        {!concepts?.length ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <BrainCircuit className="h-6 w-6" />
            </div>
            <p className="text-base font-semibold text-foreground">No concepts extracted yet</p>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Concepts will appear here once document processing finishes and the workspace
              knowledge map is ready.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 px-4 sm:px-6 py-4 sm:py-5">
            {concepts.map((concept) => (
              <div
                key={concept.id as string}
                className="inline-flex max-w-full items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-sm text-foreground"
              >
                <BrainCircuit className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate">{concept.name as string}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

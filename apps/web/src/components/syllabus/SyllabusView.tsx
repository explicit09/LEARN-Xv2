'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'

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
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  if (!syllabus) {
    return (
      <p className="text-sm text-muted-foreground">
        {hasDocuments
          ? 'Syllabus is being generated… Check back after document processing completes.'
          : 'No syllabus yet. Upload documents to generate a learning syllabus automatically.'}
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {syllabus.units.map((unit) => {
        const isOpen = openUnits.has(unit.id)
        return (
          <div key={unit.id} className="overflow-hidden rounded-lg border">
            <button
              onClick={() => toggleUnit(unit.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/20"
            >
              <span className="font-medium">{unit.title}</span>
              <span className="text-muted-foreground">{isOpen ? '▲' : '▼'}</span>
            </button>
            {isOpen && (
              <div className="divide-y border-t">
                {unit.topics.map((topic) => (
                  <div key={topic.id} className="px-4 py-3">
                    <p className="text-sm font-medium">{topic.title}</p>
                    {topic.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{topic.description}</p>
                    )}
                    {topic.conceptNames.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {topic.conceptNames.map((name) => (
                          <span
                            key={name}
                            className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    )}
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

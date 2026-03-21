'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

interface CollapsibleSectionProps {
  icon: string
  summary: string
  label: string
  children: ReactNode
  defaultExpanded?: boolean
}

export function CollapsibleSection({
  icon,
  summary,
  label,
  children,
  defaultExpanded = false,
}: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  if (expanded) {
    return <>{children}</>
  }

  return (
    <button
      type="button"
      onClick={() => setExpanded(true)}
      className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl border border-border bg-card/40 hover:bg-card/70 transition-colors text-left group"
    >
      <span className="text-lg shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{summary}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <div className="flex items-center gap-1.5 text-xs font-medium text-primary shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
        <span>Explore</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </div>
    </button>
  )
}

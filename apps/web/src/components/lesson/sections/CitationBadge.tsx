'use client'

import { useState } from 'react'
import { FileText } from 'lucide-react'

export interface SourceInfo {
  citationId: number
  chunkId: string
  documentId: string
  documentTitle: string
  pageNumber: number | null
  chunkIndex: number | null
  preview: string
}

interface CitationBadgeProps {
  n: number
  sources: SourceInfo[]
  onCitationClick?: ((n: number) => void) | undefined
}

export function CitationBadge({ n, sources, onCitationClick }: CitationBadgeProps) {
  const [showPopover, setShowPopover] = useState(false)
  const source = sources.find((s) => s.citationId === n)

  if (!source) {
    return <sup className="text-[10px] text-muted-foreground/50 mx-0.5">[{n}]</sup>
  }

  return (
    <span className="relative inline-block">
      <sup
        role="button"
        tabIndex={0}
        onClick={() => onCitationClick?.(n)}
        onMouseEnter={() => setShowPopover(true)}
        onMouseLeave={() => setShowPopover(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onCitationClick?.(n)
        }}
        className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 mx-0.5 text-[10px] font-bold rounded-full bg-primary/10 text-primary cursor-pointer hover:bg-primary/20 transition-colors leading-none align-super"
      >
        {n}
      </sup>

      {/* Hover popover */}
      {showPopover && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 rounded-xl border border-border bg-card shadow-xl p-3 pointer-events-none">
          <div className="flex items-start gap-2">
            <FileText className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">
                {source.documentTitle}
              </p>
              {source.pageNumber != null && (
                <p className="text-[10px] text-muted-foreground">Page {source.pageNumber}</p>
              )}
              {source.preview && (
                <p className="text-[10px] text-muted-foreground/70 mt-1 line-clamp-2 italic">
                  &ldquo;{source.preview}&rdquo;
                </p>
              )}
            </div>
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-card border-r border-b border-border rotate-45 -mt-1" />
        </div>
      )}
    </span>
  )
}

'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, FileText } from 'lucide-react'
import type { SourceInfo } from './CitationBadge'

interface SourcesPanelProps {
  sources: SourceInfo[]
  highlightedId?: number | null
}

export function SourcesPanel({ sources, highlightedId }: SourcesPanelProps) {
  const [expanded, setExpanded] = useState(false)

  if (!sources || sources.length === 0) return null

  return (
    <div id="sources-panel" className="mt-10 pt-6 border-t border-border/50">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 w-full text-left group"
      >
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <FileText className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Sources</p>
          <p className="text-xs text-muted-foreground">
            {sources.length} source{sources.length !== 1 ? 's' : ''} referenced
          </p>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <ol className="mt-4 space-y-3 pl-1">
          {sources.map((source) => (
            <li
              key={source.citationId}
              className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${
                highlightedId === source.citationId
                  ? 'bg-primary/10 border border-primary/20'
                  : 'bg-muted/30'
              }`}
            >
              <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                {source.citationId}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium text-foreground truncate">
                    {source.documentTitle}
                  </span>
                </div>
                {source.pageNumber != null && (
                  <p className="text-xs text-muted-foreground">Page {source.pageNumber}</p>
                )}
                {source.preview && (
                  <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2 italic">
                    &ldquo;{source.preview}&rdquo;
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

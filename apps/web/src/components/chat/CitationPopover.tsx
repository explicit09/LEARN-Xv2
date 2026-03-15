'use client'

import { useState } from 'react'

interface CitationPopoverProps {
  chunkId: string
  index: number
  chunkContent?: string
}

export function CitationPopover({ chunkId, index, chunkContent }: CitationPopoverProps) {
  const [open, setOpen] = useState(false)

  return (
    <span className="relative inline-block">
      <button
        className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors cursor-pointer align-super"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Citation ${index}`}
        title={chunkId}
      >
        {index}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 rounded-lg border border-border bg-popover p-3 shadow-md text-popover-foreground text-xs">
            <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-1">
              Source
            </p>
            <p className="leading-relaxed line-clamp-6">{chunkContent ?? 'Loading…'}</p>
          </div>
        </>
      )}
    </span>
  )
}

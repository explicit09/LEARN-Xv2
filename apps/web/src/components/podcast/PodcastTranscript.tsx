'use client'

import { useEffect, useRef } from 'react'

interface Segment {
  id: string
  segment_index: number
  speaker: string
  text: string
  start_time: number | null
  end_time: number | null
}

interface PodcastTranscriptProps {
  segments: Segment[]
  currentTime: number
  onSeekToSegment: (startTime: number) => void
}

function speakerLabel(speaker: string): string {
  return speaker === 'host_a' ? 'Rachel' : 'Antoni'
}

function speakerColor(speaker: string): string {
  return speaker === 'host_a' ? 'text-primary' : 'text-orange-500 dark:text-orange-400'
}

export function PodcastTranscript({
  segments,
  currentTime,
  onSeekToSegment,
}: PodcastTranscriptProps) {
  const activeRef = useRef<HTMLDivElement>(null)

  // Find the currently playing segment
  const activeIndex = segments.findIndex((seg) => {
    if (seg.start_time == null || seg.end_time == null) return false
    return currentTime >= seg.start_time && currentTime < seg.end_time
  })

  // Auto-scroll to active segment
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [activeIndex])

  if (segments.length === 0) return null

  return (
    <div className="max-h-60 overflow-y-auto rounded-lg border bg-muted/20 p-3 space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
        Transcript
      </p>
      {segments.map((seg, i) => {
        const isActive = i === activeIndex
        const canSeek = seg.start_time != null

        return (
          <div
            key={seg.id}
            ref={isActive ? activeRef : undefined}
            onClick={() => canSeek && onSeekToSegment(seg.start_time!)}
            className={`rounded-md px-3 py-2 text-sm transition-colors ${
              canSeek ? 'cursor-pointer' : ''
            } ${isActive ? 'bg-primary/10 border border-primary/20' : 'hover:bg-accent/50'}`}
            role={canSeek ? 'button' : undefined}
            tabIndex={canSeek ? 0 : undefined}
            onKeyDown={(e) => {
              if (canSeek && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault()
                onSeekToSegment(seg.start_time!)
              }
            }}
          >
            <span className={`text-xs font-semibold ${speakerColor(seg.speaker)}`}>
              {speakerLabel(seg.speaker)}
            </span>
            <p
              className={`mt-0.5 leading-relaxed ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}
            >
              {seg.text}
            </p>
          </div>
        )
      })}
    </div>
  )
}

'use client'

import { useState } from 'react'

interface PodcastPlayerControlsProps {
  isPlaying: boolean
  onTogglePlay: () => void
  onSkip: (seconds: number) => void
  onSpeedChange: (speed: number) => void
  onDownload?: () => void
  speed: number
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

export function PodcastPlayerControls({
  isPlaying,
  onTogglePlay,
  onSkip,
  onSpeedChange,
  onDownload,
  speed,
}: PodcastPlayerControlsProps) {
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)

  return (
    <div className="flex items-center gap-2">
      {/* Skip back 15s */}
      <button
        onClick={() => onSkip(-15)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Skip back 15 seconds"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11 17l-5-5 5-5" />
          <path d="M18 17l-5-5 5-5" />
        </svg>
      </button>

      {/* Play/Pause */}
      <button
        onClick={onTogglePlay}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-opacity"
        aria-label={isPlaying ? 'Pause podcast' : 'Play podcast'}
      >
        {isPlaying ? (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg className="h-5 w-5 translate-x-0.5" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        )}
      </button>

      {/* Skip forward 15s */}
      <button
        onClick={() => onSkip(15)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Skip forward 15 seconds"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M13 17l5-5-5-5" />
          <path d="M6 17l5-5-5-5" />
        </svg>
      </button>

      {/* Speed control */}
      <div className="relative ml-2">
        <button
          onClick={() => setShowSpeedMenu((v) => !v)}
          className="rounded-md border px-2 py-1 text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label={`Playback speed: ${speed}x`}
        >
          {speed}x
        </button>
        {showSpeedMenu && (
          <div className="absolute bottom-full left-0 mb-1 rounded-lg border bg-popover p-1 shadow-md z-10">
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  onSpeedChange(s)
                  setShowSpeedMenu(false)
                }}
                className={`block w-full rounded-md px-3 py-1 text-left text-xs font-mono transition-colors ${
                  s === speed
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Download */}
      {onDownload && (
        <button
          onClick={onDownload}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Download podcast"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
      )}
    </div>
  )
}

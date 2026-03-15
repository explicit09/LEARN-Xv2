'use client'

import { useRef, useState } from 'react'
import { trpc } from '@/lib/trpc/client'

interface AudioRecapPlayerProps {
  workspaceId: string
  lessonId: string
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function AudioRecapPlayer({ workspaceId, lessonId }: AudioRecapPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const {
    data: recap,
    isLoading,
    refetch,
  } = trpc.audioRecap.get.useQuery({ workspaceId, lessonId })
  const generateMutation = trpc.audioRecap.generate.useMutation({
    onSuccess: () => {
      // Poll for status change
      const poll = setInterval(() => {
        refetch().then((res) => {
          if (res.data?.status === 'ready' || res.data?.status === 'failed') {
            clearInterval(poll)
          }
        })
      }, 3000)
      // Stop polling after 3 minutes
      setTimeout(() => clearInterval(poll), 180000)
    },
  })

  function togglePlay() {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      void audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const time = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  if (isLoading) {
    return <div className="h-12 animate-pulse rounded-lg bg-muted" />
  }

  if (!recap) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
        <svg
          className="h-5 w-5 shrink-0 text-muted-foreground"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
        <p className="flex-1 text-sm text-muted-foreground">No audio recap yet</p>
        <button
          onClick={() => generateMutation.mutate({ workspaceId, lessonId })}
          disabled={generateMutation.isPending}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-opacity"
          aria-label="Generate audio recap for this lesson"
        >
          {generateMutation.isPending ? 'Queued…' : 'Generate recap'}
        </button>
      </div>
    )
  }

  if (recap.status === 'generating' || recap.status === 'pending') {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
        <div
          className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-label="Generating audio"
        />
        <p className="text-sm text-muted-foreground">Generating audio recap…</p>
      </div>
    )
  }

  if (recap.status === 'failed') {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
        <p className="flex-1 text-sm text-destructive">Audio generation failed</p>
        <button
          onClick={() => generateMutation.mutate({ workspaceId, lessonId })}
          disabled={generateMutation.isPending}
          className="rounded-md border border-destructive px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
          aria-label="Retry audio recap generation"
        >
          Retry
        </button>
      </div>
    )
  }

  // Recap is ready
  if (!recap.storage_url) {
    // Transcript-only mode (no ElevenLabs key)
    return (
      <details className="rounded-lg border">
        <summary className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-accent/50 transition-colors">
          <svg
            className="h-4 w-4 shrink-0 text-muted-foreground"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Audio Recap Transcript
        </summary>
        <div className="border-t px-4 py-3">
          <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
            {recap.transcript}
          </p>
        </div>
      </details>
    )
  }

  return (
    <div
      className="rounded-lg border bg-card p-4 space-y-3"
      role="region"
      aria-label="Audio recap player"
    >
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-opacity"
          aria-label={isPlaying ? 'Pause audio recap' : 'Play audio recap'}
        >
          {isPlaying ? (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg
              className="h-4 w-4 translate-x-0.5"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>

        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium truncate">{recap.title ?? 'Audio Recap'}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs tabular-nums text-muted-foreground">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || recap.duration_seconds || 0}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 accent-primary"
              aria-label="Seek audio"
            />
            <span className="text-xs tabular-nums text-muted-foreground">
              {formatTime(duration || recap.duration_seconds || 0)}
            </span>
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={recap.storage_url}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        className="hidden"
        aria-label="Audio recap"
      />
    </div>
  )
}

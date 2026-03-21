'use client'

import { useCallback, useRef, useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { PodcastPlayerControls } from './PodcastPlayerControls'
import { PodcastProgressBar } from './PodcastProgressBar'
import { PodcastTranscript } from './PodcastTranscript'

interface PodcastPlayerProps {
  workspaceId: string
  lessonId: string
  /** 'inline' = compact in lesson view; 'immersive' = full width on /podcasts/[id] */
  mode?: 'inline' | 'immersive'
}

export function PodcastPlayer({ workspaceId, lessonId, mode = 'inline' }: PodcastPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [showTranscript, setShowTranscript] = useState(mode === 'immersive')

  const {
    data: podcast,
    isLoading,
    refetch,
  } = trpc.podcast.get.useQuery({
    workspaceId,
    lessonId,
  })

  const generateMutation = trpc.podcast.generate.useMutation({
    onSuccess: () => {
      const poll = setInterval(() => {
        refetch().then((res) => {
          const s = res.data?.status
          if (s === 'ready' || s === 'failed') clearInterval(poll)
        })
      }, 3000)
      setTimeout(() => clearInterval(poll), 180000)
    },
  })

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      void audioRef.current.play()
    }
  }, [isPlaying])

  const handleSeek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }, [])

  const handleSkip = useCallback((seconds: number) => {
    if (audioRef.current) {
      const t = Math.max(
        0,
        Math.min(audioRef.current.duration, audioRef.current.currentTime + seconds),
      )
      audioRef.current.currentTime = t
      setCurrentTime(t)
    }
  }, [])

  const handleSpeedChange = useCallback((newSpeed: number) => {
    setSpeed(newSpeed)
    if (audioRef.current) audioRef.current.playbackRate = newSpeed
  }, [])

  const handleDownload = useCallback(() => {
    if (podcast?.storage_url) {
      const a = document.createElement('a')
      a.href = podcast.storage_url
      a.download = `${podcast.title ?? 'podcast'}.mp3`
      a.click()
    }
  }, [podcast])

  // Loading state
  if (isLoading) {
    return <div className="h-12 animate-pulse rounded-lg bg-muted" />
  }

  // No podcast — show generate button
  if (!podcast) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
        <svg
          className="h-5 w-5 shrink-0 text-muted-foreground"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
        <p className="flex-1 text-sm text-muted-foreground">No podcast yet</p>
        <button
          onClick={() => generateMutation.mutate({ workspaceId, lessonId })}
          disabled={generateMutation.isPending}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-opacity"
          aria-label="Generate podcast for this lesson"
        >
          {generateMutation.isPending ? 'Queued...' : 'Generate podcast'}
        </button>
      </div>
    )
  }

  // Generating states — show progress
  if (['pending', 'generating', 'synthesizing', 'assembling'].includes(podcast.status)) {
    const progressPercent = podcast.progress ?? 0
    return (
      <div className="rounded-lg border bg-muted/30 px-4 py-3 space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">
            {podcast.status === 'synthesizing'
              ? 'Synthesizing audio...'
              : podcast.status === 'assembling'
                ? 'Assembling podcast...'
                : 'Generating podcast script...'}
          </p>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    )
  }

  // Failed
  if (podcast.status === 'failed') {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
        <p className="flex-1 text-sm text-destructive">Podcast generation failed</p>
        <button
          onClick={() => generateMutation.mutate({ workspaceId, lessonId })}
          disabled={generateMutation.isPending}
          className="rounded-md border border-destructive px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  // Ready — transcript only (no TTS key)
  if (!podcast.storage_url) {
    return (
      <details className="rounded-lg border">
        <summary className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-accent/50 transition-colors">
          <svg
            className="h-4 w-4 shrink-0 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Podcast Transcript
        </summary>
        <div className="border-t px-4 py-3">
          <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
            {podcast.transcript}
          </p>
        </div>
      </details>
    )
  }

  // Ready with audio — full player
  const segments =
    (
      podcast as {
        podcast_segments?: Array<{
          id: string
          segment_index: number
          speaker: string
          text: string
          start_time: number | null
          end_time: number | null
        }>
      }
    ).podcast_segments ?? []

  return (
    <div
      className="rounded-lg border bg-card p-4 space-y-3"
      role="region"
      aria-label="Podcast player"
    >
      <PodcastPlayerControls
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        onSkip={handleSkip}
        onSpeedChange={handleSpeedChange}
        onDownload={handleDownload}
        speed={speed}
      />

      <PodcastProgressBar
        currentTime={currentTime}
        duration={duration || podcast.duration_seconds || 0}
        onSeek={handleSeek}
      />

      {/* Transcript toggle (inline mode only) */}
      {mode === 'inline' && segments.length > 0 && (
        <button
          onClick={() => setShowTranscript((v) => !v)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showTranscript ? 'Hide transcript' : 'Show transcript'}
        </button>
      )}

      {showTranscript && segments.length > 0 && (
        <PodcastTranscript
          segments={segments}
          currentTime={currentTime}
          onSeekToSegment={handleSeek}
        />
      )}

      <audio
        ref={audioRef}
        src={podcast.storage_url}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        className="hidden"
      />
    </div>
  )
}

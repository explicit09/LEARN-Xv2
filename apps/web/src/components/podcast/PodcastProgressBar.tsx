'use client'

interface PodcastProgressBarProps {
  currentTime: number
  duration: number
  onSeek: (time: number) => void
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function PodcastProgressBar({ currentTime, duration, onSeek }: PodcastProgressBarProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs tabular-nums text-muted-foreground font-mono">
        {formatTime(currentTime)}
      </span>
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={currentTime}
        onChange={(e) => onSeek(parseFloat(e.target.value))}
        className="flex-1 accent-primary h-1.5 cursor-pointer"
        aria-label="Seek podcast"
      />
      <span className="text-xs tabular-nums text-muted-foreground font-mono">
        {formatTime(duration)}
      </span>
    </div>
  )
}

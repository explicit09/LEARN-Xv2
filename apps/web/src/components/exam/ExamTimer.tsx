'use client'

import { useEffect, useRef, useState } from 'react'

interface ExamTimerProps {
  timeLimitMinutes: number
  onTimeUp: () => void
  className?: string
}

export function ExamTimer({ timeLimitMinutes, onTimeUp, className }: ExamTimerProps) {
  const totalSeconds = timeLimitMinutes * 60
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds)
  const hasCalledTimeUp = useRef(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          if (!hasCalledTimeUp.current) {
            hasCalledTimeUp.current = true
            onTimeUp()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [onTimeUp])

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const isWarning = secondsLeft <= 300 // 5 minutes
  const isDanger = secondsLeft <= 60 // 1 minute

  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  return (
    <div
      className={[
        'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-mono font-semibold tabular-nums',
        isDanger
          ? 'bg-destructive/10 text-destructive'
          : isWarning
            ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300'
            : 'bg-muted text-foreground',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="timer"
      aria-label={`Time remaining: ${timeStr}`}
      aria-live="polite"
    >
      <svg
        className="h-4 w-4"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      {timeStr}
    </div>
  )
}

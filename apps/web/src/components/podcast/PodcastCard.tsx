'use client'

import Link from 'next/link'
import { formatTime } from './PodcastProgressBar'

interface PodcastCardProps {
  podcast: {
    id: string
    title: string
    status: string
    format: string
    duration_seconds: number | null
    progress: number
    tts_provider: string
    storage_url: string | null
    created_at: string
    workspaces?: { name: string } | null
  }
  onDelete: (id: string) => void
  isDeleting: boolean
}

export function PodcastCard({ podcast, onDelete, isDeleting }: PodcastCardProps) {
  const isReady = podcast.status === 'ready'
  const isGenerating = ['pending', 'generating', 'synthesizing', 'assembling'].includes(
    podcast.status,
  )
  const isFailed = podcast.status === 'failed'

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3 hover:border-foreground/20 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium truncate">{podcast.title}</h3>
          {podcast.workspaces?.name && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {podcast.workspaces.name}
            </p>
          )}
        </div>

        {/* Status badge */}
        {isReady && (
          <span className="shrink-0 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
            Ready
          </span>
        )}
        {isGenerating && (
          <span className="shrink-0 rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-600 dark:text-yellow-400">
            {podcast.progress}%
          </span>
        )}
        {isFailed && (
          <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
            Failed
          </span>
        )}
      </div>

      {/* Progress bar for generating state */}
      {isGenerating && (
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${podcast.progress}%` }}
          />
        </div>
      )}

      {/* Metadata row */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {podcast.duration_seconds && (
          <span className="font-mono">{formatTime(podcast.duration_seconds)}</span>
        )}
        <span className="capitalize">{podcast.format.replace('_', ' ')}</span>
        <span className="capitalize">{podcast.tts_provider}</span>
        <span>{new Date(podcast.created_at).toLocaleDateString()}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {isReady && podcast.storage_url && (
          <Link
            href={`/podcasts/${podcast.id}`}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-opacity"
          >
            Listen
          </Link>
        )}
        <button
          onClick={() => onDelete(podcast.id)}
          disabled={isDeleting}
          className="rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-destructive hover:border-destructive/30 disabled:opacity-50 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

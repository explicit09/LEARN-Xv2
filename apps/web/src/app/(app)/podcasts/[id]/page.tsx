'use client'

import { use } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc/client'
import { PodcastPlayer } from '@/components/podcast/PodcastPlayer'

export default function PodcastDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: podcast, isLoading } = trpc.podcast.getById.useQuery({ podcastId: id })

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="h-48 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (!podcast) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-center">
        <h1 className="text-lg font-medium">Podcast not found</h1>
        <Link href="/podcasts" className="text-sm text-primary hover:underline mt-2 inline-block">
          Back to library
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/podcasts"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Library
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold tracking-tight">{podcast.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {podcast.format === 'conversation' ? 'Two-host conversation' : 'Solo narration'}
          {podcast.duration_seconds
            ? ` \u00B7 ${Math.ceil(podcast.duration_seconds / 60)} min`
            : ''}
        </p>
      </div>

      {podcast.lesson_id && podcast.workspace_id && (
        <PodcastPlayer
          workspaceId={podcast.workspace_id}
          lessonId={podcast.lesson_id}
          mode="immersive"
        />
      )}
    </div>
  )
}

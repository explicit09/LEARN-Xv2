'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { PodcastCard } from './PodcastCard'

export function PodcastLibrary() {
  const [search, setSearch] = useState('')

  const { data: podcasts, isLoading, refetch } = trpc.podcast.listAll.useQuery({ limit: 50 })

  const deleteMutation = trpc.podcast.delete.useMutation({
    onSuccess: () => refetch(),
  })

  const filtered = (podcasts ?? []).filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()),
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  if (!podcasts?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <svg
          className="h-12 w-12 text-muted-foreground/50 mb-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
        <h2 className="text-lg font-medium">No podcasts yet</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          Generate a podcast from any lesson to hear an engaging two-host conversation about the
          material.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search podcasts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <span className="text-sm text-muted-foreground">
          {filtered.length} podcast{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* List */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((podcast) => {
          // Supabase returns joined relations as arrays
          const ws = Array.isArray(podcast.workspaces) ? podcast.workspaces[0] : podcast.workspaces
          return (
            <PodcastCard
              key={podcast.id}
              podcast={{ ...podcast, workspaces: ws ?? null }}
              onDelete={(id) => deleteMutation.mutate({ podcastId: id })}
              isDeleting={deleteMutation.isPending}
            />
          )
        })}
      </div>
    </div>
  )
}

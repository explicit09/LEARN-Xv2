import Link from 'next/link'

interface WorkspaceCardProps {
  id: string
  name: string
  description?: string | null
  status: string
  totalTokenCount: number
  updatedAt?: string | null
  createdAt?: string | null
}

export function WorkspaceCard({
  id,
  name,
  description,
  status,
  totalTokenCount,
  updatedAt,
}: WorkspaceCardProps) {
  const isActive = status === 'active'
  const lastUpdated = updatedAt
    ? new Date(updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null
  const tokenLabel =
    totalTokenCount > 0
      ? totalTokenCount > 1_000_000
        ? `${(totalTokenCount / 1_000_000).toFixed(1)}M tokens`
        : totalTokenCount > 1_000
          ? `${Math.round(totalTokenCount / 1_000)}k tokens`
          : `${totalTokenCount} tokens`
      : null

  return (
    <Link
      href={`/workspace/${id}`}
      className="group block rounded-2xl glass-card p-5 transition-all hover:border-primary/50 relative overflow-hidden min-h-[120px]"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-primary/10 transition-colors" />

      <div className="relative z-10 flex flex-col h-full justify-between gap-4">
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-bold text-lg leading-tight line-clamp-2">{name}</h3>
          <div
            className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full border ${
              isActive
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-muted text-muted-foreground border-border'
            }`}
          >
            {isActive ? 'Active' : status}
          </div>
        </div>

        {description && <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{tokenLabel ?? 'No content yet'}</span>
          {lastUpdated && <span>Updated {lastUpdated}</span>}
        </div>
      </div>
    </Link>
  )
}

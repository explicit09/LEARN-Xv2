import Link from 'next/link'
import { Badge } from '@learn-x/ui'
import { cn } from '@learn-x/utils'

interface WorkspaceCardProps {
  id: string
  name: string
  description?: string | null
  status: string
  totalTokenCount: number
  updatedAt?: string | null
  createdAt?: string | null
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  archived: 'Archived',
  processing: 'Processing',
}

export function WorkspaceCard({
  id,
  name,
  description,
  status,
  totalTokenCount,
  updatedAt,
  createdAt,
}: WorkspaceCardProps) {
  const dateStr = updatedAt ?? createdAt
  const formattedDate = dateStr
    ? new Date(dateStr).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <Link
      href={`/workspace/${id}`}
      className="group block rounded-lg border bg-card p-5 transition-colors hover:border-foreground/20 hover:bg-muted/50"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium">{name}</h3>
          {description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <Badge variant={status === 'active' ? 'default' : 'secondary'} className="shrink-0">
          {STATUS_LABELS[status] ?? status}
        </Badge>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        {totalTokenCount > 0 ? (
          <p className="text-xs text-muted-foreground">
            {(totalTokenCount / 1000).toFixed(1)}k tokens ingested
          </p>
        ) : (
          <span />
        )}
        {formattedDate && <p className="text-xs text-muted-foreground">Updated {formattedDate}</p>}
      </div>
    </Link>
  )
}

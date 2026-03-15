import Link from 'next/link'

interface LessonCardProps {
  id: string
  workspaceId: string
  title: string
  orderIndex: number
  summary?: string | null
  isCompleted: boolean
}

export function LessonCard({
  id,
  workspaceId,
  title,
  orderIndex,
  summary,
  isCompleted,
}: LessonCardProps) {
  return (
    <Link
      href={`/workspace/${workspaceId}/lesson/${id}`}
      className="block rounded-lg border border-border p-4 hover:border-foreground/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs text-muted-foreground font-mono w-5 flex-shrink-0">
            {orderIndex + 1}
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-foreground truncate">{title}</h3>
            {summary && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{summary}</p>
            )}
          </div>
        </div>
        {isCompleted && (
          <span className="text-xs text-green-600 dark:text-green-400 flex-shrink-0 font-medium">
            ✓ Done
          </span>
        )}
      </div>
    </Link>
  )
}

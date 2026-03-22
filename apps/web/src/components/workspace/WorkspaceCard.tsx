import Link from 'next/link'
import { Badge, Card } from '@learn-x/ui'
import { ArrowUpRight, BookOpen, Clock, FolderOpen, Sparkles } from 'lucide-react'
import { cn } from '@learn-x/utils'

interface WorkspaceCardProps {
  id: string
  name: string
  description?: string | null
  status: string
  totalTokenCount: number
  documentsCount?: number
  conceptsCount?: number
  lessonsCount?: number
  completedLessonsCount?: number
  progressLabel?: string
  summary?: string
  tokenLabel?: string
  nextActionLabel?: string
  nextActionHref?: string
  statusTone?: 'empty' | 'building' | 'active'
  updatedAt?: string | null
  createdAt?: string | null
}

function formatModifiedDate(dateString: string | null | undefined): string {
  if (!dateString) return 'New'
  const date = new Date(dateString)
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  const day = date.getDate()
  return `Modified: ${month} ${day}`
}

const DOCUMENT_PREFIX_REGEX = /^Document:\s*/i

function cleanWorkspaceName(name: string | null | undefined): string {
  if (!name || typeof name !== 'string') return 'Untitled'
  return name.replace(DOCUMENT_PREFIX_REGEX, '').trim() || 'Untitled'
}

export function WorkspaceCard({
  id,
  name,
  description,
  documentsCount = 0,
  conceptsCount = 0,
  lessonsCount = 0,
  completedLessonsCount = 0,
  summary,
  nextActionHref,
  updatedAt,
  statusTone = 'empty',
}: WorkspaceCardProps) {
  const displayName = cleanWorkspaceName(name)
  const href = `/workspace/${id}`
  const progress =
    lessonsCount > 0 ? Math.round((completedLessonsCount / Math.max(lessonsCount, 1)) * 100) : 0
  const featured = statusTone === 'active'

  return (
    <Link href={href} className="group block h-full">
      <Card
        className={cn(
          'group relative flex h-full flex-col justify-between overflow-hidden border p-4 transition-all duration-200 sm:p-5 md:p-6',
          'bg-card text-card-foreground hover:border-primary/40 hover:shadow-lg',
          featured && 'border-primary/30 bg-gradient-to-b from-primary/5 to-card',
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        <div className="absolute right-4 top-4 translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
          <ArrowUpRight className="h-4 w-4 text-primary" />
        </div>

        <div className="relative z-10 flex flex-1 flex-col">
          <div className="mb-2 sm:mb-4 flex items-start justify-between gap-3">
            <div
              className={cn(
                'flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl transition-colors',
                featured
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground',
              )}
            >
              {featured ? <Sparkles className="h-5 w-5" /> : <FolderOpen className="h-5 w-5" />}
            </div>

            <Badge
              variant="outline"
              className="rounded-full border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
            >
              {documentsCount} Docs
            </Badge>
          </div>

          <div className="mb-2 sm:mb-4 space-y-1 sm:space-y-2">
            <h3
              className={cn(
                'line-clamp-2 font-bold text-foreground transition-colors',
                featured ? 'text-xl md:text-2xl' : 'text-base md:text-lg group-hover:text-primary',
              )}
            >
              {displayName}
            </h3>
            {(summary || description) && (
              <p className="hidden sm:block line-clamp-2 text-sm leading-6 text-muted-foreground">
                {summary || description}
              </p>
            )}
          </div>

          <div className="mb-3 sm:mb-6 mt-auto flex flex-wrap gap-2 sm:gap-3">
            {lessonsCount > 0 && (
              <Badge
                variant="outline"
                className="gap-1.5 rounded-full border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
              >
                <BookOpen className="h-3 w-3" />
                {lessonsCount} Lessons
              </Badge>
            )}
            {conceptsCount > 0 && (
              <Badge
                variant="outline"
                className="rounded-full border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
              >
                {conceptsCount} Concepts
              </Badge>
            )}
            <Badge
              variant="outline"
              className="gap-1.5 rounded-full border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
            >
              <Clock className="h-3 w-3" />
              {formatModifiedDate(updatedAt)}
            </Badge>
          </div>
        </div>

        <div className="relative z-10 border-t border-border pt-2 sm:pt-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="mb-1.5 flex justify-between text-xs font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Sparkles
                    className={cn('h-3 w-3', progress >= 80 ? 'text-amber-500' : 'text-primary')}
                  />
                  Mastery
                </span>
                <span className="text-foreground">
                  {progress === 0 ? 'Start learning' : `${progress}%`}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full transition-all duration-1000 ease-out',
                    progress === 0
                      ? 'bg-muted-foreground/30'
                      : progress >= 80
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                        : 'bg-primary',
                  )}
                  style={{ width: progress === 0 ? '100%' : `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}

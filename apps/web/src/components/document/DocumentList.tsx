'use client'

import { trpc } from '@/lib/trpc/client'
import { FileText, FileSearch, Filter, CheckCircle2, Clock, RotateCcw } from 'lucide-react'

interface DocumentListProps {
  workspaceId: string
}

const FILE_TYPE_ICON: Record<string, React.ElementType> = {
  pdf: FileText,
  docx: FileText,
  txt: FileText,
  md: FileText,
}

const STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType }> = {
  uploading: { color: 'text-muted-foreground', icon: Clock },
  processing: { color: 'text-amber-500', icon: FileSearch },
  ready: { color: 'text-emerald-700 dark:text-emerald-400', icon: CheckCircle2 },
  failed: { color: 'text-red-500', icon: Filter },
}

export function DocumentList({ workspaceId }: DocumentListProps) {
  const utils = trpc.useUtils()
  const { data: documents, isLoading } = trpc.document.list.useQuery(
    { workspaceId },
    {
      refetchInterval: (query) => {
        const docs = query.state.data
        const hasActive = docs?.some((d) =>
          ['uploading', 'processing'].includes(d.status as string),
        )
        return hasActive ? 3000 : false
      },
    },
  )

  const retryMutation = trpc.document.retryProcessing.useMutation({
    onSuccess: () => utils.document.list.invalidate({ workspaceId }),
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl border border-border bg-muted/50"
          />
        ))}
      </div>
    )
  }

  if (!documents?.length) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border/50 bg-card/20 backdrop-blur-sm">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground mb-4">
          <FileText className="w-6 h-6" />
        </div>
        <p className="font-semibold text-foreground mb-1">No documents found</p>
        <p className="text-sm text-muted-foreground">
          Upload reference materials to start extracting concepts and generating lessons.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => {
        const Icon = FILE_TYPE_ICON[doc.file_type as string] ?? FileText
        const statusKey = doc.status as keyof typeof STATUS_CONFIG
        const statusConfig = (STATUS_CONFIG[statusKey] || STATUS_CONFIG.ready)!
        const StatusIcon = statusConfig.icon
        const isFailed = statusKey === 'failed'

        return (
          <div
            key={doc.id as string}
            className="group flex items-start gap-4 rounded-2xl border border-border/50 bg-card/40 p-4 backdrop-blur-xl transition-all hover:border-primary/20 hover:bg-card/80"
          >
            <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform border border-primary/20 shadow-inner">
              <Icon className="w-6 h-6" />
            </div>

            <div className="min-w-0 flex-1 pt-1">
              <div className="flex items-start justify-between gap-4">
                <p className="truncate text-base font-bold text-foreground mb-1 pr-2">
                  {doc.title as string}
                </p>
                <span className="hidden shrink-0 text-[11px] font-semibold text-muted-foreground sm:inline">
                  {(doc.token_count as number | null)
                    ? `${Math.round((doc.token_count as number) / 1000)}k tokens`
                    : ''}
                </span>
              </div>
              <p className="mb-2 text-xs text-muted-foreground">
                Ready for concept extraction, lesson generation, and downstream study flows.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusConfig.color}`}
                >
                  <StatusIcon className="w-3.5 h-3.5" />
                  {doc.status as string}
                </span>
                <span className="rounded-full border border-border/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {doc.file_type as string}
                </span>
                {(doc.token_count as number | null) ? (
                  <span className="rounded-full border border-border/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:hidden">
                    {Math.round((doc.token_count as number) / 1000)}k tokens
                  </span>
                ) : null}
              </div>

              {isFailed && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    retryMutation.mutate({ documentId: doc.id as string })
                  }}
                  disabled={retryMutation.isPending}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <RotateCcw className="w-3 h-3" />
                  {retryMutation.isPending ? 'Retrying…' : 'Retry'}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

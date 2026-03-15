'use client'

import { useQuery } from '@tanstack/react-query'
import { trpc } from '@/lib/trpc/client'

interface DocumentListProps {
  workspaceId: string
}

const FILE_TYPE_ICON: Record<string, string> = {
  pdf: '📄',
  docx: '📝',
  txt: '📃',
  md: '📋',
}

const STATUS_COLOR: Record<string, string> = {
  uploading: 'text-muted-foreground',
  processing: 'text-amber-600',
  ready: 'text-green-600',
  failed: 'text-destructive',
}

export function DocumentList({ workspaceId }: DocumentListProps) {
  const { data: documents, isLoading } = trpc.document.list.useQuery({ workspaceId })

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  if (!documents?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No documents yet. Upload one above to get started.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.id as string}
          className="flex items-start gap-3 rounded-lg border bg-card p-3"
        >
          <span className="mt-0.5 text-xl">
            {FILE_TYPE_ICON[doc.file_type as string] ?? '📄'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{doc.title as string}</p>
            <p className={['text-xs', STATUS_COLOR[doc.status as string] ?? 'text-muted-foreground'].join(' ')}>
              {doc.status as string}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

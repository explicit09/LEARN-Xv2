'use client'

import { useCallback } from 'react'
import { trpc } from '@/lib/trpc/client'
import { UploadDropzone } from './UploadDropzone'
import { DocumentList } from './DocumentList'
import { HardDriveDownload, FolderOpen } from 'lucide-react'

interface WorkspaceDocumentsProps {
  workspaceId: string
}

export function WorkspaceDocuments({ workspaceId }: WorkspaceDocumentsProps) {
  const utils = trpc.useUtils()

  const handleUploadComplete = useCallback(() => {
    void utils.document.list.invalidate({ workspaceId })
  }, [utils, workspaceId])

  return (
    <div className="grid gap-4 sm:gap-6 p-3 sm:p-4 lg:grid-cols-2 lg:p-6">
      <section className="rounded-2xl sm:rounded-[28px] border border-border/60 bg-background/80 p-4 sm:p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <HardDriveDownload className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              Ingestion
            </p>
            <h2 className="text-lg font-bold">Add Materials</h2>
          </div>
        </div>
        <p className="mb-4 text-sm leading-6 text-muted-foreground">
          Upload lectures, notes, readings, or paste a link. This is the source layer the workspace
          builds from.
        </p>
        <UploadDropzone workspaceId={workspaceId} onUploadComplete={handleUploadComplete} />
      </section>

      <section className="min-w-0 rounded-2xl sm:rounded-[28px] border border-border/60 bg-card/50 p-4 sm:p-5 shadow-sm lg:p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <FolderOpen className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                Documents
              </p>
              <h2 className="text-lg font-bold">Workspace Documents</h2>
            </div>
          </div>
        </div>

        <DocumentList workspaceId={workspaceId} />
      </section>
    </div>
  )
}

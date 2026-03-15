'use client'

import { useCallback } from 'react'
import { trpc } from '@/lib/trpc/client'
import { UploadDropzone } from './UploadDropzone'
import { DocumentList } from './DocumentList'

interface WorkspaceDocumentsProps {
  workspaceId: string
}

export function WorkspaceDocuments({ workspaceId }: WorkspaceDocumentsProps) {
  const utils = trpc.useUtils()

  const handleUploadComplete = useCallback(() => {
    void utils.document.list.invalidate({ workspaceId })
  }, [utils, workspaceId])

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Upload a document</h2>
        <UploadDropzone workspaceId={workspaceId} onUploadComplete={handleUploadComplete} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Documents</h2>
        <DocumentList workspaceId={workspaceId} />
      </section>
    </div>
  )
}

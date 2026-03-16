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
    <div className="grid lg:grid-cols-3 gap-8 p-4">
      {/* Upload Column */}
      <section className="col-span-1 flex flex-col gap-4">
        <div className="flex items-center gap-2 mb-2">
           <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
             <HardDriveDownload className="w-4 h-4" />
           </div>
           <h2 className="text-lg font-bold">Add Materials</h2>
        </div>
        <div className="glass-card rounded-2xl p-6 border border-border/50 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <UploadDropzone workspaceId={workspaceId} onUploadComplete={handleUploadComplete} />
        </div>
      </section>

      {/* Docs Column */}
      <section className="col-span-1 lg:col-span-2 flex flex-col gap-4">
        <div className="flex items-center gap-2 mb-2">
           <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
             <FolderOpen className="w-4 h-4" />
           </div>
           <h2 className="text-lg font-bold">Workspace Documents</h2>
        </div>
        <div className="p-1">
          <DocumentList workspaceId={workspaceId} />
        </div>
      </section>
    </div>
  )
}

'use client'

import { useCallback, useRef, useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { MAX_FILE_SIZE_BYTES } from '@learn-x/validators'

const ACCEPTED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/plain': 'txt',
  'text/markdown': 'md',
  'text/html': 'html',
}

interface UploadDropzoneProps {
  workspaceId: string
  onUploadComplete?: () => void
}

export function UploadDropzone({ workspaceId, onUploadComplete }: UploadDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const initiate = trpc.document.initiateUpload.useMutation()
  const confirm = trpc.document.confirmUpload.useMutation()

  const processFile = useCallback(
    async (file: File) => {
      setError(null)
      const fileType = ACCEPTED_TYPES[file.type]
      if (!fileType) {
        setError('Unsupported file type. Please upload a PDF, DOCX, PPTX, TXT, MD, or HTML file.')
        return
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError('File is too large. Maximum size is 50MB.')
        return
      }

      setUploading(true)
      try {
        const result = await initiate.mutateAsync({
          workspaceId,
          title: file.name.replace(/\.[^.]+$/, ''),
          fileType: fileType as 'pdf' | 'docx' | 'pptx' | 'txt' | 'md' | 'html',
          fileSizeBytes: file.size,
        })

        // Upload directly to Supabase Storage via signed URL
        const uploadRes = await fetch(result.signedUploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        })
        if (!uploadRes.ok) throw new Error('Upload to storage failed')

        // Confirm upload and kick off processing job
        await confirm.mutateAsync({ documentId: result.documentId })
        onUploadComplete?.()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed')
      } finally {
        setUploading(false)
      }
    },
    [workspaceId, initiate, confirm, onUploadComplete],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) void processFile(file)
    },
    [processFile],
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) void processFile(file)
      e.target.value = ''
    },
    [processFile],
  )

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        disabled={uploading}
        className={[
          'flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 transition-colors',
          isDragging
            ? 'border-foreground bg-muted'
            : 'border-border hover:border-muted-foreground hover:bg-muted/50',
          uploading ? 'cursor-not-allowed opacity-60' : '',
        ].join(' ')}
      >
        <svg
          className="mb-3 h-8 w-8 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        {uploading ? (
          <p className="text-sm font-medium">Uploading…</p>
        ) : (
          <>
            <p className="text-sm font-medium">Drop a file here or click to browse</p>
            <p className="mt-1 text-xs text-muted-foreground">PDF, DOCX, TXT, MD — up to 50MB</p>
          </>
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.pptx,.txt,.md,.html,.htm"
        className="hidden"
        onChange={handleFileChange}
      />

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  )
}

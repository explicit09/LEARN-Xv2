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
  const [uploadProgress, setUploadProgress] = useState(0)
  const [urlMode, setUrlMode] = useState(false)
  const [urlValue, setUrlValue] = useState('')

  const initiate = trpc.document.initiateUpload.useMutation()
  const confirm = trpc.document.confirmUpload.useMutation()
  const ingestUrl = trpc.document.ingestUrl.useMutation()

  const uploadWithProgress = useCallback(
    (url: string, file: File): Promise<void> =>
      new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', url)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Upload failed'))
        xhr.onerror = () => reject(new Error('Upload failed'))
        xhr.send(file)
      }),
    [],
  )

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
      setUploadProgress(0)
      try {
        const result = await initiate.mutateAsync({
          workspaceId,
          title: file.name.replace(/\.[^.]+$/, ''),
          fileType: fileType as 'pdf' | 'docx' | 'pptx' | 'txt' | 'md' | 'html',
          fileSizeBytes: file.size,
        })

        await uploadWithProgress(result.signedUploadUrl, file)
        await confirm.mutateAsync({ documentId: result.documentId })
        onUploadComplete?.()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed')
      } finally {
        setUploading(false)
        setUploadProgress(0)
      }
    },
    [workspaceId, initiate, confirm, uploadWithProgress, onUploadComplete],
  )

  const handleUrlSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const url = urlValue.trim()
      if (!url) return

      setError(null)
      setUploading(true)
      try {
        await ingestUrl.mutateAsync({ workspaceId, url })
        setUrlValue('')
        setUrlMode(false)
        onUploadComplete?.()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to ingest URL')
      } finally {
        setUploading(false)
      }
    },
    [workspaceId, urlValue, ingestUrl, onUploadComplete],
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
    <div className="w-full space-y-3">
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
          'flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 sm:px-6 sm:py-10 transition-colors min-h-[44px]',
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
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-medium">Uploading… {uploadProgress}%</p>
            <div className="h-1.5 w-48 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium">Drop a file here or click to browse</p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, DOCX, PPTX, TXT, MD, HTML — up to 50MB
            </p>
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

      {urlMode ? (
        <form onSubmit={handleUrlSubmit} className="flex gap-2">
          <input
            type="url"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            placeholder="Paste a URL or YouTube link"
            disabled={uploading}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={uploading || !urlValue.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Ingest
          </button>
          <button
            type="button"
            onClick={() => {
              setUrlMode(false)
              setUrlValue('')
              setError(null)
            }}
            className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setUrlMode(true)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Or paste a URL / YouTube link
        </button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

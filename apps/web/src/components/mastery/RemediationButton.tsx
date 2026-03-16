'use client'

import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'

interface RemediationButtonProps {
  workspaceId: string
  conceptId: string
  conceptName: string
}

export function RemediationButton({ workspaceId, conceptId, conceptName }: RemediationButtonProps) {
  const router = useRouter()
  const mutation = trpc.mastery.getRemediationPath.useMutation({
    onSuccess: (data) => {
      // Navigate to lesson when job queued
      // The lesson will be created by the job — navigate to workspace lessons tab
      router.push(`/workspace/${workspaceId}?tab=lessons`)
    },
  })

  return (
    <button
      onClick={() => mutation.mutate({ workspaceId, conceptId })}
      disabled={mutation.isPending || mutation.isSuccess}
      className="inline-flex items-center gap-1.5 rounded-md bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50 transition-colors"
      aria-label={`Fix struggling concept: ${conceptName}`}
    >
      {mutation.isPending ? (
        <>
          <span
            className="h-3 w-3 animate-spin rounded-full border border-destructive border-t-transparent"
            aria-hidden="true"
          />
          Generating…
        </>
      ) : mutation.isSuccess ? (
        <>
          <svg
            className="h-3 w-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Queued
        </>
      ) : (
        <>
          <svg
            className="h-3 w-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Fix now
        </>
      )}
    </button>
  )
}

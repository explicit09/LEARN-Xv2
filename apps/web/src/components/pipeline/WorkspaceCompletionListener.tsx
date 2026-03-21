'use client'

import { useWorkspaceCompletion } from '@/hooks/useWorkspaceCompletion'

interface WorkspaceCompletionListenerProps {
  workspaceId: string
}

/**
 * Invisible client component that listens for lesson completion events
 * and shows global toast notifications.
 */
export function WorkspaceCompletionListener({ workspaceId }: WorkspaceCompletionListenerProps) {
  useWorkspaceCompletion(workspaceId)
  return null
}

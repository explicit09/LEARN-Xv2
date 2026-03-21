'use client'

import { useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { toast } from 'sonner'

/**
 * Listens for new lessons being inserted into a workspace via Supabase Realtime.
 * Shows a global toast notification when lessons are generated.
 * Safe to mount on any page — only fires for the given workspace.
 */
export function useWorkspaceCompletion(workspaceId: string | null) {
  const countRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!workspaceId) return

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    countRef.current = 0

    const channel = supabase
      .channel(`workspace-lessons:${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lessons',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => {
          countRef.current++

          // Debounce — wait 5s after last insert to batch the toast
          if (timerRef.current) clearTimeout(timerRef.current)
          timerRef.current = setTimeout(() => {
            const count = countRef.current
            toast.success(count === 1 ? 'New lesson ready!' : `${count} new lessons generated!`, {
              description: 'Your learning path has been updated.',
              duration: 6000,
            })
            countRef.current = 0
          }, 5000)
        },
      )
      .subscribe()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      void supabase.removeChannel(channel)
    }
  }, [workspaceId])
}

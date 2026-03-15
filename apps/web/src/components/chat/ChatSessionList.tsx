'use client'

import Link from 'next/link'
import { trpc } from '@/lib/trpc/client'

interface ChatSessionListProps {
  workspaceId: string
  activeSessionId?: string
}

export function ChatSessionList({ workspaceId, activeSessionId }: ChatSessionListProps) {
  const { data: sessions, isLoading } = trpc.chat.listSessions.useQuery({ workspaceId })

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-9 rounded-md bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      <Link
        href={`/workspace/${workspaceId}/chat`}
        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
      >
        + New Chat
      </Link>
      {(sessions ?? []).map((session: unknown) => {
        const s = session as { id: string; title?: string | null; created_at?: string }
        const isActive = s.id === activeSessionId
        return (
          <Link
            key={s.id}
            href={`/workspace/${workspaceId}/chat/${s.id}`}
            className={`rounded-md px-3 py-2 text-sm truncate transition-colors ${
              isActive ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {s.title ?? 'Untitled chat'}
          </Link>
        )
      })}
      {sessions?.length === 0 && (
        <p className="px-3 py-2 text-xs text-muted-foreground">No chats yet</p>
      )}
    </div>
  )
}

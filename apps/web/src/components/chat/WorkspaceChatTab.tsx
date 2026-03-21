'use client'

import { useState, useMemo } from 'react'
import { trpc } from '@/lib/trpc/client'
import { ChatInterface } from './ChatInterface'
import { MessageSquare, Plus, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@learn-x/ui'

interface WorkspaceChatTabProps {
  workspaceId: string
}

export function WorkspaceChatTab({ workspaceId }: WorkspaceChatTabProps) {
  const [sessionId, setSessionId] = useState<string | null>(null)

  const {
    data: sessions,
    isLoading: loadingSessions,
    refetch,
  } = trpc.chat.listSessions.useQuery({ workspaceId })

  const createSession = trpc.chat.createSession.useMutation({
    onSuccess: (data) => {
      setSessionId(data.id as string)
      void refetch()
    },
  })

  const deleteSession = trpc.chat.deleteSession.useMutation({
    onSuccess: () => {
      if (sessions && sessions.length > 1) {
        const remaining = sessions.filter((s) => (s.id as string) !== sessionId)
        setSessionId(remaining[0] ? (remaining[0].id as string) : null)
      } else {
        setSessionId(null)
      }
      void refetch()
    },
  })

  // Derive effective session: use explicit selection, or fall back to most recent
  const effectiveSessionId = useMemo(() => {
    if (sessionId) return sessionId
    if (!loadingSessions && sessions && sessions.length > 0) {
      return sessions[0].id as string
    }
    return null
  }, [sessionId, sessions, loadingSessions])

  const handleNewChat = () => {
    createSession.mutate({ workspaceId })
  }

  const sortedSessions = (sessions ?? []).sort(
    (a, b) =>
      new Date(b.updated_at as string).getTime() - new Date(a.updated_at as string).getTime(),
  )

  if (loadingSessions) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Chat history sidebar */}
      <div className="w-64 shrink-0 border-r border-border bg-card/30 flex flex-col min-h-0">
        <div className="p-3 border-b border-border/50">
          <Button
            onClick={handleNewChat}
            disabled={createSession.isPending}
            className="w-full rounded-xl h-9 text-sm font-medium"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {sortedSessions.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">No conversations yet</p>
          )}
          {sortedSessions.map((session) => {
            const isActive = (session.id as string) === effectiveSessionId
            const title = (session.title as string) || 'New conversation'
            const updatedAt = new Date(session.updated_at as string)
            const timeAgo = formatTimeAgo(updatedAt)

            return (
              <div
                key={session.id as string}
                role="button"
                tabIndex={0}
                onClick={() => setSessionId(session.id as string)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setSessionId(session.id as string)
                }}
                className={`w-full text-left p-2.5 rounded-lg flex items-start gap-2.5 transition-all group cursor-pointer ${
                  isActive
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-muted/50 border border-transparent'
                }`}
              >
                <MessageSquare
                  className={`w-4 h-4 shrink-0 mt-0.5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs font-medium truncate ${isActive ? 'text-primary' : 'text-foreground'}`}
                  >
                    {title}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo}</p>
                </div>
                {isActive && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteSession.mutate({ id: session.id as string, workspaceId })
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Chat content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {effectiveSessionId ? (
          <ChatWithMessages
            key={effectiveSessionId}
            sessionId={effectiveSessionId}
            workspaceId={workspaceId}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground mb-4">Start a conversation</p>
              <Button
                onClick={handleNewChat}
                disabled={createSession.isPending}
                className="rounded-xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Chat
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** Loads messages for a session then renders ChatInterface */
function ChatWithMessages({ sessionId, workspaceId }: { sessionId: string; workspaceId: string }) {
  const { data, isLoading } = trpc.chat.getSession.useQuery({ id: sessionId, workspaceId })

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    )
  }

  const messages = (
    (data?.messages ?? []) as {
      id: string
      role: string
      content: string
      cited_chunk_ids?: string[] | null
    }[]
  )
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      cited_chunk_ids: m.cited_chunk_ids ?? null,
    }))

  return (
    <ChatInterface sessionId={sessionId} workspaceId={workspaceId} initialMessages={messages} />
  )
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

'use client'

import { use, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import { Topbar } from '@/components/layout/Topbar'

interface StudyRoomPageProps {
  params: Promise<{ roomId: string }>
}

function MemberList({ members }: { members: { userId: string; joinedAt: string }[] }) {
  return (
    <aside className="w-48 shrink-0 border-l bg-card p-3 space-y-2" aria-label="Room members">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Members ({members.length})
      </p>
      {members.map((m) => (
        <div key={m.userId} className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
            {m.userId.slice(0, 1).toUpperCase()}
          </div>
          <span className="text-xs truncate">{m.userId.slice(0, 8)}…</span>
        </div>
      ))}
    </aside>
  )
}

function ChatPanel({ roomId, currentUserId }: { roomId: string; currentUserId: string }) {
  const [message, setMessage] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: messages, refetch } = trpc.studyRoom.getMessages.useQuery(
    { roomId },
    { refetchInterval: 3000 },
  )

  const sendMutation = trpc.studyRoom.sendMessage.useMutation({
    onSuccess: () => {
      setMessage('')
      void refetch()
    },
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    const content = message.trim()
    if (!content) return
    sendMutation.mutate({ roomId, content })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {!messages?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No messages yet. Start the conversation!
          </p>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.userId === currentUserId
            return (
              <div key={msg.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                <div className="h-7 w-7 shrink-0 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                  {msg.userId.slice(0, 1).toUpperCase()}
                </div>
                <div
                  className={`max-w-xs rounded-lg px-3 py-2 text-sm ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                >
                  <p>{msg.content}</p>
                  <p
                    className={`text-xs mt-1 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t p-3 flex gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send)"
          rows={2}
          className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Message input"
        />
        <button
          onClick={handleSend}
          disabled={!message.trim() || sendMutation.isPending}
          className="self-end rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-opacity"
          aria-label="Send message"
        >
          Send
        </button>
      </div>
    </div>
  )
}

function StudyRoomView({ roomId }: { roomId: string }) {
  const router = useRouter()
  const utils = trpc.useUtils()
  const { data: room, isLoading } = trpc.studyRoom.get.useQuery({ roomId })
  const { data: me } = trpc.user.getProfile.useQuery()

  const leaveMutation = trpc.studyRoom.leave.useMutation({
    onSuccess: () => {
      void utils.studyRoom.get.invalidate()
      router.back()
    },
  })

  const closeMutation = trpc.studyRoom.close.useMutation({
    onSuccess: () => {
      void utils.studyRoom.get.invalidate()
      router.back()
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!room) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-muted-foreground">Room not found</p>
      </div>
    )
  }

  const isHost = me?.id === room.hostUserId || me?.authId === room.hostUserId

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <div className="flex flex-1 flex-col min-h-0">
        {/* Room header */}
        <div className="border-b px-4 py-3 flex items-center justify-between gap-3 bg-card">
          <div>
            <h1 className="font-semibold">{room.topic ?? 'Study Room'}</h1>
            <p className="text-xs text-muted-foreground">
              {room.status === 'open' ? 'Active' : 'Closed'} · {room.members.length} member
              {room.members.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isHost && room.status === 'open' && (
              <button
                onClick={() => closeMutation.mutate({ roomId })}
                disabled={closeMutation.isPending}
                className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-destructive/10 hover:text-destructive transition-colors"
                aria-label="Close room"
              >
                Close Room
              </button>
            )}
            <button
              onClick={() => leaveMutation.mutate({ roomId })}
              disabled={leaveMutation.isPending}
              className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
              aria-label="Leave room"
            >
              Leave
            </button>
          </div>
        </div>

        <ChatPanel roomId={roomId} currentUserId={me?.id ?? ''} />
      </div>
      <MemberList members={room.members} />
    </div>
  )
}

export default function StudyRoomPage({ params }: StudyRoomPageProps) {
  const { roomId } = use(params)
  return (
    <>
      <Topbar title="Study Room" />
      <StudyRoomView roomId={roomId} />
    </>
  )
}

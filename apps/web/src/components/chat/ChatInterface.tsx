'use client'

import { useEffect, useRef } from 'react'
import { useChat } from 'ai/react'
import { trpc } from '@/lib/trpc/client'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'

interface ChatInterfaceProps {
  sessionId: string
  workspaceId: string
  initialMessages: {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    cited_chunk_ids?: string[] | null
  }[]
}

export function ChatInterface({ sessionId, workspaceId, initialMessages }: ChatInterfaceProps) {
  const utils = trpc.useUtils()
  const bottomRef = useRef<HTMLDivElement>(null)

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    body: { sessionId },
    initialMessages: initialMessages.map((m) => ({
      id: m.id,
      role: m.role === 'system' ? 'system' : m.role,
      content: m.content,
    })),
    onFinish: () => {
      void utils.chat.getSession.invalidate({ id: sessionId, workspaceId })
    },
  })

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Find citations from persisted messages (streaming messages don't have them)
  const citationsMap = new Map(initialMessages.map((m) => [m.id, m.cited_chunk_ids ?? []]))

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">Ask anything about your materials</p>
          </div>
        )}
        {messages.map((m) => {
          const citations = citationsMap.get(m.id)
          return (
            <ChatMessage
              key={m.id}
              role={m.role === 'user' ? 'user' : 'assistant'}
              content={m.content}
              {...(citations && citations.length > 0 ? { citedChunkIds: citations } : {})}
            />
          )
        })}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-xl px-4 py-3 text-sm text-muted-foreground">
              <span className="animate-pulse">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-4">
        <ChatInput
          value={input}
          onChange={(v) =>
            handleInputChange({ target: { value: v } } as React.ChangeEvent<HTMLInputElement>)
          }
          onSubmit={() => handleSubmit()}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}

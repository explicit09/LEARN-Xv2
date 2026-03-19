'use client'

import { useState, useEffect, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { trpc } from '@/lib/trpc/client'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { Sparkles } from 'lucide-react'

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
  const [input, setInput] = useState('')

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { sessionId },
    }),
    messages: initialMessages.map((m) => ({
      id: m.id,
      role: m.role === 'system' ? ('system' as const) : m.role,
      parts: [{ type: 'text' as const, text: m.content }],
    })),
    onFinish: () => {
      void utils.chat.getSession.invalidate({ id: sessionId, workspaceId })
    },
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Find citations from persisted messages (streaming messages don't have them)
  const citationsMap = new Map(initialMessages.map((m) => [m.id, m.cited_chunk_ids ?? []]))

  // Extract text content from message parts
  const getMessageText = (m: (typeof messages)[number]): string => {
    return (
      m.parts
        ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join('') ?? ''
    )
  }

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full relative z-10">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-8 space-y-8 custom-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-6 shadow-inner border border-primary/20">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2">How can I help you learn?</h2>
            <p className="text-muted-foreground max-w-md">
              I have full context of your workspace documents. Ask me to explain concepts, summarize
              readings, or generate practice questions.
            </p>
          </div>
        )}

        {messages.map((m) => {
          const citations = citationsMap.get(m.id)
          return (
            <ChatMessage
              key={m.id}
              role={m.role === 'user' ? 'user' : 'assistant'}
              content={getMessageText(m)}
              {...(citations && citations.length > 0 ? { citedChunkIds: citations } : {})}
            />
          )
        })}

        {isLoading && (
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl px-5 py-3">
              <span className="flex space-x-1.5 h-6 items-center">
                <span
                  className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Input */}
      <div className="p-4 md:p-6 bg-gradient-to-t from-background via-background to-transparent">
        <ChatInput
          value={input}
          onChange={(v) => setInput(v)}
          onSubmit={() => {
            if (!input.trim()) return
            sendMessage({ text: input })
            setInput('')
          }}
          isLoading={isLoading}
        />
        <div className="text-center mt-3">
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
            AI Coach can make mistakes. Verify important information.
          </span>
        </div>
      </div>
    </div>
  )
}

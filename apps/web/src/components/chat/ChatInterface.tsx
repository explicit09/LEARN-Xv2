'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { trpc } from '@/lib/trpc/client'
import { ChatMessage as LegacyChatMessage } from './ChatMessage'
import { ChatMessage as LessonChatMessage } from '../lesson/chat/ChatMessage'
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

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: { sessionId },
      }),
    [sessionId],
  )

  const { messages, sendMessage, status } = useChat({
    transport,
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

  const TOOL_MARKER_RE = /\s*<!--TOOL_SECTIONS:[\s\S]*?-->/g

  // Extract text content from message parts (strip tool section markers)
  const getMessageText = (m: (typeof messages)[number]): string => {
    const raw =
      m.parts
        ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join('') ?? ''
    return raw.replace(TOOL_MARKER_RE, '').trim()
  }

  // Extract persisted tool sections from message content (for reloaded sessions)
  const getPersistedSections = (m: (typeof messages)[number]): Record<string, unknown>[] | null => {
    const raw =
      m.parts
        ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join('') ?? ''
    const match = /<!--TOOL_SECTIONS:([\s\S]*?)-->/.exec(raw)
    if (!match?.[1]) return null
    try {
      const toolData = JSON.parse(match[1]) as { sections: Record<string, unknown>[] }[]
      return toolData.flatMap((t) => t.sections ?? [])
    } catch {
      return null
    }
  }

  return (
    <div className="flex flex-col h-full w-full relative z-10">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 md:px-12 lg:px-20 py-8 space-y-8 custom-scrollbar">
        {messages.length === 0 && (
          <EmptyState
            workspaceId={workspaceId}
            onSelect={(q) => {
              sendMessage({ text: q })
            }}
          />
        )}

        {messages.map((m) => {
          // Use the lesson chat's ChatMessage component — it handles
          // text parts, tool-renderSections parts, streaming states,
          // and error fallbacks (rawInput) all in one place.
          const parts = (m.parts ?? []) as {
            type: string
            text?: string
            toolName?: string
            input?: Record<string, unknown>
            rawInput?: Record<string, unknown>
            state?: string
          }[]

          // For user messages, use the legacy styled bubble
          if (m.role === 'user') {
            const text = getMessageText(m)
            if (!text) return null
            return <LegacyChatMessage key={m.id} role="user" content={text} />
          }

          // For assistant messages, use the lesson chat renderer
          // which handles text + tool calls in a single pass
          return (
            <div key={m.id} className="flex justify-start">
              <div className="max-w-[85%]">
                <LessonChatMessage role="assistant" parts={parts} />
              </div>
            </div>
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
      <div className="px-6 md:px-12 lg:px-20 py-4 bg-gradient-to-t from-background via-background to-transparent">
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

function EmptyState({
  workspaceId,
  onSelect,
}: {
  workspaceId: string
  onSelect: (q: string) => void
}) {
  const { data: concepts } = trpc.concept.list.useQuery({ workspaceId })
  const topConcepts = (concepts ?? []).slice(0, 3)

  const starters =
    topConcepts.length > 0
      ? [
          `Explain "${topConcepts[0]?.name}" in simple terms`,
          ...(topConcepts[1]
            ? [`How does "${topConcepts[0]?.name}" relate to "${topConcepts[1]?.name}"?`]
            : []),
          ...(topConcepts[2] ? [`Give me practice questions about "${topConcepts[2]?.name}"`] : []),
        ]
      : [
          'Summarize the key ideas from my documents',
          'What are the most important concepts I should focus on?',
          'Generate practice questions from this material',
        ]

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-8 shadow-inner border border-primary/20">
        <Sparkles className="w-10 h-10" />
      </div>
      <h2 className="text-3xl font-black tracking-tight mb-3">How can I help you learn?</h2>
      <p className="text-muted-foreground max-w-lg mb-10 text-base">
        I have full context of your workspace documents. Ask me to explain concepts, summarize
        readings, or generate practice questions.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-lg">
        {starters.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onSelect(q)}
            className="text-left rounded-xl border border-border/50 bg-card/40 px-5 py-4 text-sm text-muted-foreground hover:text-foreground hover:bg-card/80 hover:border-primary/30 transition-all"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { trpc } from '@/lib/trpc/client'
import { LessonRenderer } from './LessonRenderer'
import { sanitizeFlatSections } from './sanitize-sections'
import { SimpleMarkdown } from './SimpleMarkdown'
import type { LessonSection } from '@learn-x/validators'
import { MessageSquare, X, Sparkles, ArrowUp, Minus } from 'lucide-react'
import { Button } from '@learn-x/ui'

interface LessonChatProps {
  lessonId: string
  workspaceId: string
}

const SUGGESTED_QUESTIONS = [
  'Explain this differently',
  'Give me a practice problem',
  'How does this connect to prior concepts?',
]

export function LessonChat({ lessonId, workspaceId }: LessonChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [sessionCreated, setSessionCreated] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const createSession = trpc.chat.createSession.useMutation({
    onSuccess: () => setSessionCreated(true),
  })

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/lesson-chat',
        body: { lessonId, workspaceId },
      }),
    [lessonId, workspaceId],
  )

  const { messages, sendMessage, status } = useChat({ transport })
  const isStreaming = status === 'streaming' || status === 'submitted'
  const hasMessages = messages.length > 0

  useEffect(() => {
    if (isOpen && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 150)
  }, [isOpen])

  async function handleSend(text?: string) {
    const content = text ?? chatInput
    if (!content.trim() || isStreaming) return
    if (!sessionCreated && !createSession.isPending) {
      createSession.mutate({ workspaceId, lessonId })
    }
    sendMessage({ text: content })
    setChatInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  // FAB button (collapsed)
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {/* Suggestion pills — show on hover or when no messages yet */}
        <div className="hidden md:flex flex-col items-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
          {!hasMessages &&
            SUGGESTED_QUESTIONS.map((q) => (
              <button
                type="button"
                key={q}
                onClick={() => {
                  setIsOpen(true)
                  void handleSend(q)
                }}
                className="text-xs font-medium px-3 py-1.5 rounded-full border border-border bg-card shadow-md text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors pointer-events-auto"
              >
                {q}
              </button>
            ))}
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-105 transition-all flex items-center justify-center"
        >
          <MessageSquare className="w-6 h-6" />
          {hasMessages && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-background" />
          )}
        </button>
      </div>
    )
  }

  // Expanded panel — fixed bottom-right
  return (
    <div className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[calc(100vw-48px)] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-semibold">Lesson Chat</span>
          {isStreaming && (
            <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full animate-pulse">
              Thinking...
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
            title="Minimize"
          >
            <Minus className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
            title="Close"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar bg-background/50 max-h-[60vh] min-h-[180px]">
        {!hasMessages && !isStreaming && <EmptyState onSuggest={(q) => void handleSend(q)} />}

        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}

        {isStreaming && (!hasMessages || messages[messages.length - 1]?.role === 'user') && (
          <ThinkingIndicator />
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2.5 border-t border-border bg-muted/20 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void handleSend()
          }}
          className="flex items-end gap-2"
        >
          <textarea
            ref={inputRef}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this lesson..."
            rows={1}
            disabled={isStreaming}
            className="flex-1 min-h-[36px] max-h-24 resize-none bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-50"
          />
          <Button
            type="submit"
            disabled={!chatInput.trim() || isStreaming}
            size="icon"
            className="h-9 w-9 rounded-xl shrink-0"
          >
            <ArrowUp className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function EmptyState({ onSuggest }: { onSuggest: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-4 text-center">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2.5">
        <Sparkles className="w-5 h-5" />
      </div>
      <p className="text-sm font-semibold mb-0.5">Ask about this lesson</p>
      <p className="text-xs text-muted-foreground max-w-[260px] mb-3">
        Alternative explanations, practice problems, or concept connections.
      </p>
      <div className="flex flex-wrap gap-1.5 justify-center">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            type="button"
            key={q}
            onClick={() => onSuggest(q)}
            className="text-[11px] font-medium px-2.5 py-1 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}

function ThinkingIndicator() {
  return (
    <div className="flex items-start gap-2">
      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
        <Sparkles className="w-3 h-3 animate-pulse" />
      </div>
      <div className="bg-muted rounded-2xl rounded-tl-md px-3 py-2">
        <span className="flex space-x-1.5 h-4 items-center">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="w-1.5 h-1.5 bg-foreground/30 rounded-full animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: { id: string; role: string; parts?: unknown[] } }) {
  const parts = (message.parts ?? []) as Array<{
    type: string
    text?: string
    toolName?: string
    toolCallId?: string
    input?: Record<string, unknown>
    state?: string
  }>

  if (message.role === 'user') {
    const text = parts
      .filter((p) => p.type === 'text' && p.text)
      .map((p) => p.text)
      .join('')

    return (
      <div className="flex justify-end">
        <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-3.5 py-2 max-w-[85%]">
          <p className="text-sm leading-relaxed">{text}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2">
      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
        <Sparkles className="w-3 h-3" />
      </div>
      <div className="min-w-0 flex-1 space-y-2 max-w-[90%]">
        {parts.map((part, i) => (
          <AssistantPart key={i} part={part} />
        ))}
      </div>
    </div>
  )
}

function AssistantPart({
  part,
}: {
  part: {
    type: string
    text?: string
    toolName?: string
    input?: Record<string, unknown>
    state?: string
  }
}) {
  if (part.type === 'text' && part.text) {
    return (
      <div className="bg-muted/60 rounded-2xl rounded-tl-md px-3.5 py-2.5">
        <SimpleMarkdown text={part.text} />
      </div>
    )
  }

  const isRenderSections =
    part.type === 'tool-renderSections' ||
    (part.type === 'dynamic-tool' && part.toolName === 'renderSections')

  if (isRenderSections && part.input) {
    const rawSections = (part.input as { sections?: Record<string, unknown>[] }).sections
    if (!rawSections?.length) {
      if (part.state === 'input-streaming') {
        return (
          <div className="bg-muted/40 rounded-2xl px-3.5 py-2.5 text-xs text-muted-foreground animate-pulse">
            Generating structured content...
          </div>
        )
      }
      return null
    }
    const sections = sanitizeFlatSections(rawSections)
    if (!sections.length) return null
    return (
      <div className="rounded-2xl border border-border bg-background p-3">
        <LessonRenderer sections={sections} />
      </div>
    )
  }

  if (isRenderSections && part.state === 'input-streaming') {
    return (
      <div className="bg-muted/40 rounded-2xl px-3.5 py-2.5 text-xs text-muted-foreground animate-pulse">
        Generating structured content...
      </div>
    )
  }

  return null
}

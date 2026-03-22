'use client'

import { useState, useEffect, useRef, useMemo, useCallback, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { trpc } from '@/lib/trpc/client'
import { GripVertical } from 'lucide-react'

import { ChatHeader } from './ChatHeader'
import { ChatInput } from './ChatInput'
import { ChatMessage } from './ChatMessage'
import { ChatEmptyState } from './ChatEmptyState'
import { ChatFAB } from './ChatFAB'

interface LessonChatPanelProps {
  lessonId: string
  workspaceId: string
  lessonTitle?: string | undefined
  selectedText?: string | null | undefined
  onClearSelection?: (() => void) | undefined
  onOpenChange?: ((open: boolean) => void) | undefined
}

const emptySubscribe = () => () => {}
const returnTrue = () => true
const returnFalse = () => false

const DEFAULT_WIDTH = 480
const MIN_WIDTH = 320
const MAX_WIDTH = 640

export function LessonChatPanel({
  lessonId,
  workspaceId,
  lessonTitle,
  selectedText,
  onClearSelection,
  onOpenChange,
}: LessonChatPanelProps) {
  const mounted = useSyncExternalStore(emptySubscribe, returnTrue, returnFalse)
  const [isOpen, setIsOpen] = useState(false)
  const [chatWidth, setChatWidth] = useState(DEFAULT_WIDTH)
  const [isResizing, setIsResizing] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [sessionCreated, setSessionCreated] = useState(false)
  const [prevSelectedText, setPrevSelectedText] = useState('')
  const [pinnedMessages, setPinnedMessages] = useState<Set<string>>(new Set())
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

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  // Focus input when opening
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 150)
  }, [isOpen])

  // Notify parent of open state
  useEffect(() => {
    onOpenChange?.(isOpen)
  }, [isOpen, onOpenChange])

  // Derive unread count: messages added since last time panel was open
  const [seenMsgCount, setSeenMsgCount] = useState(0)
  if (isOpen && seenMsgCount !== messages.length) {
    setSeenMsgCount(messages.length)
  }
  const unreadCount = isOpen ? 0 : Math.max(0, messages.length - seenMsgCount)

  // Text selection -> auto-open chat
  if (selectedText && selectedText !== prevSelectedText) {
    setPrevSelectedText(selectedText)
    if (!isOpen) {
      setIsOpen(true)
    }
    setChatInput(`Explain this: "${selectedText}"`)
    onClearSelection?.()
  }

  // Keyboard shortcut: Cmd/Ctrl + /
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleOpen = useCallback(() => {
    setIsOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleSend = useCallback(
    (text?: string) => {
      const content = text ?? chatInput
      if (!content.trim() || isStreaming) return
      if (!sessionCreated && !createSession.isPending) {
        createSession.mutate({ workspaceId, lessonId })
      }
      sendMessage({ text: content })
      setChatInput('')
    },
    [chatInput, isStreaming, sessionCreated, createSession, workspaceId, lessonId, sendMessage],
  )

  const togglePin = useCallback((msgId: string) => {
    setPinnedMessages((prev) => {
      const next = new Set(prev)
      if (next.has(msgId)) next.delete(msgId)
      else next.add(msgId)
      return next
    })
  }, [])

  // Resize handling
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsResizing(true)
      const startX = e.clientX
      const startWidth = chatWidth

      function onMouseMove(ev: MouseEvent) {
        const delta = startX - ev.clientX
        setChatWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + delta)))
      }
      function onMouseUp() {
        setIsResizing(false)
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [chatWidth],
  )

  // FAB when collapsed
  if (!isOpen || !mounted) {
    return <ChatFAB onClick={handleOpen} unreadCount={unreadCount} hasMessages={hasMessages} />
  }

  // Portal to document.body so panel is at true page edge (not constrained by parent containers)
  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: chatWidth, opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 h-screen z-40 flex flex-col bg-background/95 backdrop-blur-xl border-l border-border shadow-lg max-sm:!w-full"
        style={{ width: chatWidth }}
      >
        {/* Resize handle */}
        <div
          onMouseDown={handleResizeStart}
          className={`absolute left-0 top-0 h-full w-1.5 cursor-col-resize group/resize z-10 hidden sm:block ${isResizing ? 'bg-primary/30' : 'hover:bg-primary/20'}`}
        >
          <div className="absolute left-0 top-1/2 -translate-y-1/2 opacity-0 group-hover/resize:opacity-100 transition-opacity">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        <ChatHeader
          title={lessonTitle ? `${lessonTitle}` : 'Lesson Chat'}
          isStreaming={isStreaming}
          onClose={handleClose}
          onToggleSize={() => setChatWidth((w) => (w >= MAX_WIDTH ? DEFAULT_WIDTH : MAX_WIDTH))}
          isExpanded={chatWidth >= MAX_WIDTH}
        />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar">
          {!hasMessages && !isStreaming && <ChatEmptyState onSend={handleSend} />}

          {messages.map((m) => (
            <ChatMessage
              key={m.id}
              role={m.role}
              parts={
                (m.parts ?? []) as {
                  type: string
                  text?: string
                  toolName?: string
                  input?: Record<string, unknown>
                  rawInput?: Record<string, unknown>
                  state?: string
                }[]
              }
              isPinned={pinnedMessages.has(m.id)}
              onTogglePin={m.role === 'assistant' ? () => togglePin(m.id) : undefined}
            />
          ))}

          {/* Thinking indicator */}
          {isStreaming && (!hasMessages || messages[messages.length - 1]?.role === 'user') && (
            <div className="flex items-center gap-2">
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
          )}

          <div ref={bottomRef} />
        </div>

        <div className="px-3 py-2 border-t border-border/50">
          <ChatInput
            value={chatInput}
            onChange={setChatInput}
            onSend={() => handleSend()}
            disabled={isStreaming}
            isStreaming={isStreaming}
          />
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}

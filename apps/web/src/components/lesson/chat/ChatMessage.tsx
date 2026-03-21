'use client'

import { useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Copy, Check, Pin } from 'lucide-react'
import { LessonRenderer } from '../LessonRenderer'
import { sanitizeFlatSections } from '../sanitize-sections'

interface MessagePart {
  type: string
  text?: string
  toolName?: string
  toolCallId?: string
  input?: Record<string, unknown>
  rawInput?: Record<string, unknown>
  state?: string
}

interface ChatMessageProps {
  role: string
  parts: MessagePart[]
  isPinned?: boolean | undefined
  onTogglePin?: (() => void) | undefined
}

export function ChatMessage({ role, parts, isPinned, onTogglePin }: ChatMessageProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyText = useCallback(async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  if (role === 'user') {
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

  // Assistant message
  return (
    <div className="group space-y-2">
      {parts.map((part, i) => {
        if (part.type === 'step-start') return null

        if (part.type === 'text' && part.text) {
          return (
            <div key={i} className="relative">
              <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:text-foreground/90 prose-p:mb-2 prose-headings:font-bold prose-headings:text-foreground">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {part.text}
                </ReactMarkdown>
              </div>
              {/* Hover actions */}
              <div className="absolute -top-2 right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => void copyText(part.text!, `text-${i}`)}
                  className="p-1 rounded-md bg-muted/80 hover:bg-muted text-muted-foreground text-xs"
                >
                  {copiedId === `text-${i}` ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
                {onTogglePin && (
                  <button
                    type="button"
                    onClick={onTogglePin}
                    className={`p-1 rounded-md bg-muted/80 hover:bg-muted text-xs ${isPinned ? 'text-primary' : 'text-muted-foreground'}`}
                  >
                    <Pin className={`w-3 h-3 ${isPinned ? 'fill-current' : ''}`} />
                  </button>
                )}
              </div>
            </div>
          )
        }

        // Tool calls (renderSections)
        const isRenderSections =
          part.type === 'tool-renderSections' ||
          (part.type === 'dynamic-tool' && part.toolName === 'renderSections')

        const toolInput = part.input ?? part.rawInput
        if (isRenderSections && toolInput) {
          const rawSections = (toolInput as { sections?: Record<string, unknown>[] }).sections
          if (!rawSections?.length) {
            if (part.state === 'input-streaming') {
              return (
                <div
                  key={i}
                  className="bg-muted/40 rounded-xl px-3 py-2 text-xs text-muted-foreground animate-pulse"
                >
                  Generating structured content...
                </div>
              )
            }
            return null
          }
          const sections = sanitizeFlatSections(rawSections)
          if (!sections.length) return null
          return (
            <div key={i} className="rounded-xl border border-border bg-background p-3">
              <LessonRenderer sections={sections} />
            </div>
          )
        }

        if (isRenderSections && part.state === 'input-streaming') {
          return (
            <div
              key={i}
              className="bg-muted/40 rounded-xl px-3 py-2 text-xs text-muted-foreground animate-pulse"
            >
              Generating structured content...
            </div>
          )
        }

        return null
      })}
    </div>
  )
}

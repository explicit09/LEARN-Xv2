'use client'

import { useEffect, useRef } from 'react'
import { ArrowUp, Loader2 } from 'lucide-react'

import { cn } from '@learn-x/utils'

interface ChatInputProps {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  disabled: boolean
  isStreaming: boolean
}

export function ChatInput({ value, onChange, onSend, disabled, isStreaming }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [value])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && value.trim()) {
        onSend()
      }
    }
  }

  return (
    <div className="px-3 pb-2 pt-1">
      <div
        className={cn(
          'flex items-end gap-2 rounded-[22px] border border-border/50',
          'bg-muted/50 px-4 py-2',
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Ask about this lesson..."
          rows={1}
          className={cn(
            'max-h-[200px] min-h-[40px] flex-1 resize-none bg-transparent',
            'text-sm leading-normal placeholder:text-muted-foreground/60',
            'focus:outline-none disabled:opacity-50',
          )}
        />

        <button
          type="button"
          onClick={onSend}
          disabled={disabled || !value.trim()}
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
            'bg-primary text-primary-foreground',
            'transition-opacity disabled:opacity-40',
          )}
          aria-label="Send message"
        >
          {isStreaming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowUp className="h-4 w-4" />
          )}
        </button>
      </div>

      <p className="mt-1 text-center text-[10px] text-muted-foreground/50">
        Enter to send &middot; &#8679; Enter for newline
      </p>
    </div>
  )
}

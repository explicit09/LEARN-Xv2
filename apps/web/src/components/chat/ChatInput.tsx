'use client'

import { useRef, type FormEvent } from 'react'
import { ArrowUp, Paperclip } from 'lucide-react'
import { Button } from '@learn-x/ui'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isLoading: boolean
}

export function ChatInput({ value, onChange, onSubmit, isLoading }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!value.trim() || isLoading) return
    onSubmit()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Submit on Enter (without shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!value.trim() || isLoading) return
      onSubmit()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative group">
      <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-purple-500/20 to-primary/20 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200" />
      
      <div className="relative flex items-center gap-2 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-2 shadow-2xl focus-within:border-primary/50 focus-within:bg-card transition-all">
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <Paperclip className="w-4 h-4" />
        </Button>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message AI Coach..."
          rows={1}
          disabled={isLoading}
          className="flex-1 max-h-32 min-h-10 resize-none bg-transparent px-2 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
          style={{ height: 'auto' }}
        />

        <Button
          type="submit"
          disabled={!value.trim() || isLoading}
          className={`shrink-0 h-10 w-10 rounded-xl transition-all ${
            value.trim() && !isLoading 
              ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(37,99,235,0.5)] hover:bg-primary/90 hover:scale-105'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          <ArrowUp className="w-5 h-5" />
        </Button>
      </div>
    </form>
  )
}

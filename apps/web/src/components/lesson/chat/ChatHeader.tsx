import { ChevronRight, Maximize2, Minimize2, Sparkles } from 'lucide-react'

import { cn } from '@learn-x/utils'

interface ChatHeaderProps {
  title: string
  isStreaming: boolean
  onClose: () => void
  onToggleSize: () => void
  isExpanded: boolean
}

export function ChatHeader({
  title,
  isStreaming,
  onClose,
  onToggleSize,
  isExpanded,
}: ChatHeaderProps) {
  return (
    <div className="flex h-10 items-center justify-between border-b bg-muted/30 px-3">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <span className="text-sm font-semibold truncate max-w-[200px]">{title}</span>
        {isStreaming && (
          <span className="animate-pulse rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            Thinking…
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onToggleSize}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-md',
            'text-muted-foreground hover:bg-muted hover:text-foreground',
            'transition-colors',
          )}
          aria-label={isExpanded ? 'Minimize chat' : 'Maximize chat'}
        >
          {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={onClose}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-md',
            'text-muted-foreground hover:bg-muted hover:text-foreground',
            'transition-colors',
          )}
          aria-label="Close chat"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

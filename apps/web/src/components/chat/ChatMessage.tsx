import { CitationPopover } from './CitationPopover'

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system'
  content: string
  citedChunkIds?: string[] | null
}

export function ChatMessage({ role, content, citedChunkIds }: ChatMessageProps) {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
          isUser ? 'bg-foreground text-background' : 'bg-muted text-foreground'
        }`}
      >
        <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
        {!isUser && citedChunkIds && citedChunkIds.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {citedChunkIds.map((id, i) => (
              <CitationPopover key={id} chunkId={id} index={i + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

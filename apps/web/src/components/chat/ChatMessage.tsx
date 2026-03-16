import { CitationPopover } from './CitationPopover'

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system'
  content: string
  citedChunkIds?: string[] | null
}

/** Render inline markdown: bold, italic, inline code. Input is already HTML-escaped. */
function renderInline(line: string): string {
  return line
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(
      /`([^`]+)`/g,
      '<code class="rounded bg-muted/60 px-1 py-0.5 text-xs font-mono">$1</code>',
    )
}

type Block =
  | { type: 'heading'; level: number; html: string }
  | { type: 'hr' }
  | { type: 'paragraph'; html: string }
  | { type: 'code_block'; lines: string[] }
  | { type: 'list'; items: string[] }

function parseMarkdown(text: string): Block[] {
  const blocks: Block[] = []
  const rawLines = text.split('\n')
  let i = 0

  while (i < rawLines.length) {
    const line = rawLines[i] ?? ''

    // Fenced code block
    if (line.startsWith('```')) {
      const codeLines: string[] = []
      i++
      while (i < rawLines.length && !(rawLines[i] ?? '').startsWith('```')) {
        codeLines.push(rawLines[i] ?? '')
        i++
      }
      i++ // skip closing ```
      blocks.push({ type: 'code_block', lines: codeLines })
      continue
    }

    // Heading
    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(line)
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1]!.length,
        html: renderInline(headingMatch[2] ?? ''),
      })
      i++
      continue
    }

    // HR
    if (/^---+$/.test(line.trim())) {
      blocks.push({ type: 'hr' })
      i++
      continue
    }

    // List item
    if (/^[-*]\s/.test(line) || /^\d+\.\s/.test(line)) {
      const items: string[] = []
      while (
        i < rawLines.length &&
        (/^[-*]\s/.test(rawLines[i] ?? '') || /^\d+\.\s/.test(rawLines[i] ?? ''))
      ) {
        const itemText = (rawLines[i] ?? '').replace(/^[-*]\s/, '').replace(/^\d+\.\s/, '')
        items.push(renderInline(itemText))
        i++
      }
      blocks.push({ type: 'list', items })
      continue
    }

    // Empty line — skip
    if (line.trim() === '') {
      i++
      continue
    }

    // Paragraph — accumulate consecutive non-special lines
    const paraLines: string[] = []
    while (
      i < rawLines.length &&
      (rawLines[i] ?? '').trim() !== '' &&
      !/^#{1,3}\s/.test(rawLines[i] ?? '') &&
      !(rawLines[i] ?? '').startsWith('```') &&
      !/^[-*]\s/.test(rawLines[i] ?? '') &&
      !/^\d+\.\s/.test(rawLines[i] ?? '')
    ) {
      paraLines.push(renderInline(rawLines[i] ?? ''))
      i++
    }
    if (paraLines.length > 0) {
      blocks.push({ type: 'paragraph', html: paraLines.join('<br />') })
    }
  }

  return blocks
}

function MarkdownContent({ content }: { content: string }) {
  const blocks = parseMarkdown(content)
  return (
    <div className="space-y-2 leading-relaxed">
      {blocks.map((block, idx) => {
        if (block.type === 'heading') {
          const levelCls =
            block.level === 1
              ? 'text-base font-bold'
              : block.level === 2
                ? 'text-sm font-bold'
                : 'text-sm font-semibold'
          if (block.level === 1) {
            return (
              <h1 key={idx} className={levelCls} dangerouslySetInnerHTML={{ __html: block.html }} />
            )
          }
          if (block.level === 2) {
            return (
              <h2 key={idx} className={levelCls} dangerouslySetInnerHTML={{ __html: block.html }} />
            )
          }
          return (
            <h3 key={idx} className={levelCls} dangerouslySetInnerHTML={{ __html: block.html }} />
          )
        }

        if (block.type === 'hr') {
          return <hr key={idx} className="border-border" />
        }

        if (block.type === 'code_block') {
          return (
            <pre
              key={idx}
              className="overflow-x-auto rounded bg-muted/60 px-3 py-2 text-xs font-mono"
            >
              <code>{block.lines.join('\n')}</code>
            </pre>
          )
        }

        if (block.type === 'list') {
          return (
            <ul key={idx} className="list-disc space-y-0.5 pl-4">
              {block.items.map((item, j) => (
                <li key={j} dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ul>
          )
        }

        // paragraph
        return <p key={idx} dangerouslySetInnerHTML={{ __html: block.html }} />
      })}
    </div>
  )
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
        {isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
        ) : (
          <MarkdownContent content={content} />
        )}
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

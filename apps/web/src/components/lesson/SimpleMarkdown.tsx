/** Minimal markdown renderer for lesson chat responses */

export function SimpleMarkdown({ text }: { text: string }) {
  const blocks = text.split(/\n\n+/)

  return (
    <div className="space-y-2 text-sm leading-relaxed text-foreground/90">
      {blocks.map((block, i) => {
        const trimmed = block.trim()
        if (!trimmed) return null

        // Headers
        if (trimmed.startsWith('### '))
          return (
            <p key={i} className="font-semibold text-foreground">
              {trimmed.slice(4)}
            </p>
          )
        if (trimmed.startsWith('## '))
          return (
            <p key={i} className="font-bold text-foreground">
              {trimmed.slice(3)}
            </p>
          )

        // Bullet list
        if (/^[-*•] /m.test(trimmed)) {
          const lines = trimmed.split('\n')
          return (
            <ul key={i} className="list-disc pl-4 space-y-0.5">
              {lines
                .filter((l) => /^[-*•] /.test(l.trim()))
                .map((line, j) => (
                  <li key={j}>
                    <InlineMarkdown text={line.trim().replace(/^[-*•] /, '')} />
                  </li>
                ))}
            </ul>
          )
        }

        // Numbered list
        if (/^\d+[.)]\s/.test(trimmed)) {
          const lines = trimmed.split('\n')
          return (
            <ol key={i} className="list-decimal pl-4 space-y-0.5">
              {lines
                .filter((l) => /^\d+[.)]\s/.test(l.trim()))
                .map((line, j) => (
                  <li key={j}>
                    <InlineMarkdown text={line.trim().replace(/^\d+[.)]\s/, '')} />
                  </li>
                ))}
            </ol>
          )
        }

        // Code block
        if (trimmed.startsWith('```')) {
          const code = trimmed.replace(/^```\w*\n?/, '').replace(/\n?```$/, '')
          return (
            <pre
              key={i}
              className="bg-background border border-border rounded-lg p-3 overflow-x-auto"
            >
              <code className="text-xs font-mono">{code}</code>
            </pre>
          )
        }

        // Regular paragraph
        return (
          <p key={i}>
            <InlineMarkdown text={trimmed} />
          </p>
        )
      })}
    </div>
  )
}

/** Renders bold, italic, inline code within a line */
function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/)

  return (
    <>
      {parts.map((segment, i) => {
        if (segment.startsWith('**') && segment.endsWith('**'))
          return (
            <strong key={i} className="font-semibold text-foreground">
              {segment.slice(2, -2)}
            </strong>
          )
        if (segment.startsWith('*') && segment.endsWith('*'))
          return <em key={i}>{segment.slice(1, -1)}</em>
        if (segment.startsWith('`') && segment.endsWith('`'))
          return (
            <code key={i} className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
              {segment.slice(1, -1)}
            </code>
          )
        return <span key={i}>{segment}</span>
      })}
    </>
  )
}

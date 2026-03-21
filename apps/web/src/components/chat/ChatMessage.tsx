'use client'

import { useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check } from 'lucide-react'
import { CitationPopover } from './CitationPopover'

/** Convert markdown formatting inside HTML blocks to HTML tags */
function preprocessContent(content: string): string {
  return content
    .replace(/<details>\s*\n?\s*<summary>/g, '\n\n<details><summary>')
    .replace(/<\/details>/g, '</details>\n\n')
    .replace(/<details>([\s\S]*?)<\/details>/g, (match) => {
      return match
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
    })
}

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system'
  content: string
  citedChunkIds?: string[] | null
}

export function ChatMessage({ role, content, citedChunkIds }: ChatMessageProps) {
  const isUser = role === 'user'
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const copyCode = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedCode(text)
    setTimeout(() => setCopiedCode(null), 2000)
  }, [])

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
          isUser ? 'bg-foreground text-background' : 'bg-muted/50 text-foreground'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:mb-2 prose-headings:mb-2 prose-headings:mt-4 prose-li:my-0.5">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex, rehypeRaw]}
              components={{
                h1: ({ children }) => <h1 className="text-base font-bold mt-4 mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-sm font-bold mt-3 mb-2">{children}</h2>,
                h3: ({ children }) => (
                  <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-foreground">{children}</strong>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-primary/40 pl-3 my-2 text-muted-foreground italic">
                    {children}
                  </blockquote>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    className="text-primary underline underline-offset-2"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-3 rounded-lg border border-border">
                    <table className="w-full text-xs border-collapse">{children}</table>
                  </div>
                ),
                thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
                th: ({ children }) => (
                  <th className="text-left py-2 px-3 font-bold text-xs uppercase tracking-wider">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="py-2 px-3 border-t border-border/50">{children}</td>
                ),
                code: ({ className, children }) => {
                  const match = /language-(\w+)/.exec(className ?? '')
                  const language = match ? match[1] : ''
                  const codeString = String(children ?? '').replace(/\n$/, '')

                  if (match && language) {
                    return (
                      <div className="relative group my-3 rounded-lg overflow-hidden border border-border">
                        <div className="flex items-center justify-between bg-zinc-900 border-b border-white/10 px-3 py-1">
                          <span className="text-[10px] text-zinc-400 uppercase tracking-wide">
                            {language}
                          </span>
                          <button
                            type="button"
                            onClick={() => void copyCode(codeString)}
                            className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10 text-zinc-400"
                          >
                            {copiedCode === codeString ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <SyntaxHighlighter
                          style={oneDark}
                          language={language}
                          PreTag="div"
                          customStyle={{
                            margin: 0,
                            padding: '0.75rem',
                            fontSize: '0.75rem',
                            lineHeight: '1.5',
                          }}
                        >
                          {codeString}
                        </SyntaxHighlighter>
                      </div>
                    )
                  }

                  return (
                    <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                      {children}
                    </code>
                  )
                },
                pre: ({ children }) => <>{children}</>,
                hr: () => <hr className="border-border my-4" />,
                details: ({ children }) => (
                  <details className="my-3 rounded-lg border border-border bg-muted/20 overflow-hidden [&>*:not(summary)]:px-4 [&>*:not(summary)]:py-2">
                    {children}
                  </details>
                ),
                summary: ({ children }) => (
                  <summary className="cursor-pointer px-4 py-2.5 font-medium text-sm bg-muted/40 hover:bg-muted/60 transition-colors select-none">
                    {children}
                  </summary>
                ),
              }}
            >
              {preprocessContent(content)}
            </ReactMarkdown>
          </div>
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

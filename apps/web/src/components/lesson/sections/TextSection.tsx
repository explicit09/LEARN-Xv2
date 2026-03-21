'use client'

import { useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check } from 'lucide-react'
import type { Components } from 'react-markdown'
import { validateAndSanitizeContent, isProblematicContent } from '@/lib/content-validation'
import { remarkCitations } from '@/lib/remark-citations'
import { CitationBadge, type SourceInfo } from './CitationBadge'

interface TextSectionProps {
  content: string
  sourceMapping?: SourceInfo[] | undefined
  onCitationClick?: ((n: number) => void) | undefined
}

export function TextSection({ content, sourceMapping, onCitationClick }: TextSectionProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const copyToClipboard = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedCode(text)
    setTimeout(() => setCopiedCode(null), 2000)
  }, [])

  const sanitized = validateAndSanitizeContent(content)
  if (!sanitized || isProblematicContent(sanitized)) {
    return (
      <div className="text-sm text-muted-foreground italic py-4">
        Content could not be rendered.
      </div>
    )
  }

  const components: Components = {
    h1: ({ children }) => (
      <h1 className="text-3xl font-black tracking-tight mt-8 mb-4 text-foreground">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-2xl font-bold tracking-tight mt-6 mb-3 text-foreground">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-xl font-bold mt-5 mb-2 text-foreground">{children}</h3>
    ),
    p: ({ children }) => (
      <p className="leading-relaxed mb-4 last:mb-0 text-foreground/90">{children}</p>
    ),
    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-primary/40 pl-4 my-4 text-muted-foreground italic">
        {children}
      </blockquote>
    ),
    ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-1.5">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-1.5">{children}</ol>,
    li: ({ children }) => <li className="leading-relaxed text-foreground/90">{children}</li>,
    a: ({ href, children }) => (
      <a
        href={href}
        className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    code: ({ className, children }) => {
      const match = /language-(\w+)/.exec(className ?? '')
      const language = match ? match[1] : ''
      const isBlock = Boolean(match)
      const codeString = String(children ?? '').replace(/\n$/, '')

      if (isBlock && language) {
        return (
          <div className="relative group mb-4 rounded-xl overflow-hidden border border-border shadow-sm">
            <div className="flex items-center justify-between bg-zinc-900 border-b border-white/10 px-4 py-1.5">
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide">
                {language}
              </span>
              <button
                type="button"
                onClick={() => void copyToClipboard(codeString)}
                className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10 text-zinc-400"
              >
                {copiedCode === codeString ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <SyntaxHighlighter
              style={oneDark}
              language={language}
              PreTag="div"
              customStyle={{ margin: 0, padding: '1rem', fontSize: '0.8125rem', lineHeight: '1.6' }}
            >
              {codeString}
            </SyntaxHighlighter>
          </div>
        )
      }

      if (!isBlock) {
        return (
          <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground">
            {children}
          </code>
        )
      }

      // Block code without language
      return (
        <div className="relative group mb-4 rounded-xl overflow-hidden border border-border">
          <pre className="bg-zinc-900 p-4 overflow-x-auto">
            <code className="text-sm font-mono text-zinc-100">{codeString}</code>
          </pre>
          <button
            type="button"
            onClick={() => void copyToClipboard(codeString)}
            className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10 text-zinc-400"
          >
            {copiedCode === codeString ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      )
    },
    pre: ({ children }) => <>{children}</>,
    table: ({ children }) => (
      <div className="overflow-x-auto my-4 rounded-xl border border-border">
        <table className="w-full text-sm border-collapse">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
    th: ({ children }) => (
      <th className="text-left py-2.5 px-4 font-bold text-foreground text-xs uppercase tracking-wider">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="py-2.5 px-4 text-foreground/90 border-t border-border/50">{children}</td>
    ),
    hr: () => <hr className="border-border my-6" />,
    'citation-marker': ({ n }: { n?: string }) => {
      const num = Number(n)
      if (!num || !sourceMapping?.length)
        return <sup className="text-[10px] text-muted-foreground">[{n}]</sup>
      return <CitationBadge n={num} sources={sourceMapping} onCitationClick={onCitationClick} />
    },
  } as Record<string, React.ComponentType<never>>

  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkCitations]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {sanitized}
      </ReactMarkdown>
    </div>
  )
}

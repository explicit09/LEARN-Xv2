import { Quote } from 'lucide-react'

interface QuoteBlockProps {
  quote: string
  attribution: string
}

export function QuoteBlock({ quote, attribution }: QuoteBlockProps) {
  return (
    <div className="rounded-2xl bg-foreground/[0.03] border border-border/60 p-6 lg:p-8 relative">
      <Quote className="w-8 h-8 text-foreground/10 absolute top-5 right-6" />
      <blockquote className="relative z-10">
        <p className="text-lg italic text-foreground/85 leading-relaxed font-serif">
          &ldquo;{quote}&rdquo;
        </p>
        <footer className="mt-4 flex items-center gap-2">
          <div className="w-8 h-px bg-foreground/20" />
          <cite className="text-sm font-medium text-muted-foreground not-italic">
            {attribution}
          </cite>
        </footer>
      </blockquote>
    </div>
  )
}

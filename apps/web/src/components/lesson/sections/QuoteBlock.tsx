interface QuoteBlockProps {
  quote: string
  attribution: string
}

export function QuoteBlock({ quote, attribution }: QuoteBlockProps) {
  return (
    <blockquote className="border-l-2 border-foreground/30 pl-4 py-1 space-y-1">
      <p className="text-sm italic text-foreground/80">&ldquo;{quote}&rdquo;</p>
      <p className="text-xs text-muted-foreground">— {attribution}</p>
    </blockquote>
  )
}

interface TextSectionProps {
  content: string
}

export function TextSection({ content }: TextSectionProps) {
  return (
    <div className="prose prose-sm max-w-none text-foreground">
      {content.split('\n\n').map((para, i) => (
        <p key={i} className="leading-relaxed">
          {para}
        </p>
      ))}
    </div>
  )
}

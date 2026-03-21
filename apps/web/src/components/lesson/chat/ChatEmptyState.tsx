import { BookOpen, HelpCircle, Lightbulb, Sparkles } from 'lucide-react'

import { Button } from '@learn-x/ui'

const quickActions = [
  {
    icon: Lightbulb,
    label: 'Explain differently',
    message: 'Can you explain this concept differently?',
  },
  {
    icon: BookOpen,
    label: 'Real-world examples',
    message: 'Can you provide real-world examples?',
  },
  {
    icon: HelpCircle,
    label: 'Why important?',
    message: 'Why is this concept important to understand?',
  },
] as const

interface ChatEmptyStateProps {
  onSend: (text: string) => void
}

export function ChatEmptyState({ onSend }: ChatEmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Sparkles className="h-10 w-10 text-primary" />
      </div>

      <div className="text-center">
        <h3 className="text-sm font-semibold">Ask about this lesson</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Get explanations, examples, or ask follow-up questions about the lesson content.
        </p>
      </div>

      <div className="flex w-full flex-col gap-2">
        {quickActions.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => onSend(action.message)}
          >
            <action.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>{action.label}</span>
          </Button>
        ))}
      </div>

      <p className="mt-2 text-[10px] text-muted-foreground/40">&#8984;/ to toggle</p>
    </div>
  )
}

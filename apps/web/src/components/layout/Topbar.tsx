import type { ReactNode } from 'react'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

interface TopbarProps {
  title: string
  actions?: ReactNode
}

export function Topbar({ title, actions }: TopbarProps) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  return (
    <header className="sticky top-0 z-20 px-4 pt-4 md:px-6 md:pt-6">
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 rounded-[24px] border border-white/30 bg-white/72 px-4 py-3 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/62 md:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Learning OS
            </p>
            <span className="hidden rounded-full border border-white/40 bg-white/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground dark:border-white/10 dark:bg-white/5 sm:inline-flex">
              {today}
            </span>
          </div>
          <h1 className="mt-1 truncate text-base font-semibold tracking-tight text-foreground md:text-lg">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden lg:block">
            <ThemeToggle />
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>
    </header>
  )
}

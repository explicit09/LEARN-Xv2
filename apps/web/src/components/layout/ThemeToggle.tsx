'use client'

import { useEffect, useState } from 'react'

type Theme = 'system' | 'light' | 'dark'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system')

  useEffect(() => {
    const stored = localStorage.getItem('learn-x-theme') as Theme | null
    if (stored) setTheme(stored)
  }, [])

  function apply(next: Theme) {
    setTheme(next)
    localStorage.setItem('learn-x-theme', next)
    const html = document.documentElement
    html.classList.remove('dark', 'light')
    if (next === 'dark') html.classList.add('dark')
    if (next === 'light') html.classList.add('light')
  }

  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-muted p-0.5 text-xs">
      {(['light', 'system', 'dark'] as Theme[]).map((t) => (
        <button
          key={t}
          onClick={() => apply(t)}
          className={[
            'rounded-full px-2.5 py-1 capitalize transition-colors',
            theme === t
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          ].join(' ')}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

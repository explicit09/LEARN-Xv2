'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid Hydration Mismatch
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex items-center gap-1 rounded-full border border-border bg-muted p-0.5 text-xs h-7 w-[164px] animate-pulse" />
    )
  }

  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-muted p-0.5 text-xs">
      {(['light', 'system', 'dark'] as const).map((t) => (
        <button
          key={t}
          onClick={() => setTheme(t)}
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

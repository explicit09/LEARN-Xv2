'use client'

import Link from 'next/link'
import { BarChart3, FolderOpen, Plus } from 'lucide-react'

const DOCK_ITEMS = [
  { icon: BarChart3, label: 'Mastery', href: '/mastery' },
  { icon: FolderOpen, label: 'Workspaces', href: '/workspaces' },
]

export function QuickActionsDock() {
  return (
    <div className="fixed bottom-6 left-1/2 z-50 hidden -translate-x-1/2 md:flex items-center gap-1 rounded-2xl bg-white/80 dark:bg-black/60 backdrop-blur-xl border border-border/50 shadow-2xl ring-1 ring-border/30 px-2 py-1.5">
      {DOCK_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="group relative flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <item.icon className="h-4 w-4" />
          <span className="pointer-events-none absolute -top-8 rounded-md bg-foreground px-2 py-1 text-[10px] font-medium text-background opacity-0 transition-opacity group-hover:opacity-100">
            {item.label}
          </span>
        </Link>
      ))}
      <div className="mx-1 h-5 w-px bg-border" />
      <Link
        href="/workspaces"
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90"
      >
        <Plus className="h-4 w-4" />
      </Link>
    </div>
  )
}

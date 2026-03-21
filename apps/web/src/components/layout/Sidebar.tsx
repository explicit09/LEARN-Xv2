'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@learn-x/utils'
import { createClient } from '@/lib/supabase/client'
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  FolderOpen,
  Headphones,
  LogOut,
} from 'lucide-react'

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    shortLabel: 'Home',
  },
  {
    label: 'Workspaces',
    href: '/workspaces',
    icon: FolderOpen,
    shortLabel: 'Spaces',
  },
  {
    label: 'Podcasts',
    href: '/podcasts',
    icon: Headphones,
    shortLabel: 'Audio',
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(pathname.includes('/workspace/'))

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <aside
        className={cn(
          'relative hidden h-screen shrink-0 flex-col border-r border-white/20 bg-white/60 shadow-xl backdrop-blur-xl transition-all duration-300 dark:border-white/10 dark:bg-slate-900/60 md:flex',
          isCollapsed ? 'w-20' : 'w-[280px]',
        )}
        aria-label="Sidebar"
      >
        <button
          type="button"
          onClick={() => setIsCollapsed((value) => !value)}
          className="absolute -right-3 top-4 z-50 flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-md hover:bg-muted"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>

        <div
          className={cn(
            'flex h-16 items-center border-b border-white/10 px-4 dark:border-white/5',
            isCollapsed && 'justify-center px-2',
          )}
        >
          {isCollapsed ? (
            <Link href="/dashboard" className="relative flex h-10 w-40 items-center">
              <Image
                src="/images/learn-x-new-logo.png"
                alt="LEARN-X"
                fill
                sizes="160px"
                className="object-contain"
                priority
              />
            </Link>
          ) : (
            <Link href="/dashboard" className="relative flex h-16 w-64 items-center scale-110">
              <Image
                src="/images/learn-x-new-logo.png"
                alt="LEARN-X"
                fill
                sizes="256px"
                className="object-contain"
                priority
              />
            </Link>
          )}
        </div>

        <div className="flex-1 px-3 py-6">
          <nav className="space-y-2">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      'flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200',
                      isActive
                        ? 'bg-primary/10 text-primary font-semibold shadow-sm ring-1 ring-primary/20'
                        : 'text-muted-foreground hover:bg-white/50 hover:text-foreground dark:hover:bg-white/5',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-5 w-5 shrink-0',
                        isActive ? 'text-primary' : 'text-muted-foreground',
                      )}
                    />
                    {!isCollapsed && (
                      <span className="overflow-hidden whitespace-nowrap">{item.label}</span>
                    )}
                    {isActive && !isCollapsed && (
                      <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                  </div>
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="space-y-2 border-t border-white/10 bg-white/30 p-3 backdrop-blur-sm dark:border-white/5 dark:bg-black/20">
          <button
            onClick={handleSignOut}
            className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2 text-red-500 transition-all duration-200 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!isCollapsed && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      <nav
        className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-between rounded-[24px] border border-white/30 bg-white/80 px-2 py-2 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.24)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/85 md:hidden"
        aria-label="Mobile navigation"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-colors',
                isActive
                  ? 'bg-primary/12 text-primary'
                  : 'text-muted-foreground hover:text-foreground dark:hover:text-slate-100',
              )}
            >
              <div className="relative">
                <Icon className="h-4 w-4" />
              </div>
              <span className="truncate">{item.shortLabel}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}

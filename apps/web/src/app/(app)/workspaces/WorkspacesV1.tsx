'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button, Input } from '@learn-x/ui'
import { ArrowUpDown, BookOpen, Command, ChevronDown, Filter, Search, Sparkles } from 'lucide-react'
import { CreateWorkspaceModal } from '@/components/workspace/CreateWorkspaceModal'
import { cn } from '@learn-x/utils'
import { WorkspaceGrid } from './WorkspaceGrid'

export type FilterKey = 'all' | 'empty' | 'building' | 'active'
type SortKey = 'last_accessed' | 'name_asc' | 'lessons_desc' | 'docs_desc'

export interface WorkspaceItem {
  id: string
  name: string
  description: string | null
  status: string
  total_token_count: number
  documentsCount: number
  conceptsCount: number
  lessonsCount: number
  completedLessonsCount: number
  progressLabel: string
  summary: string
  tokenLabel: string
  nextActionLabel: string
  nextActionHref: string
  statusTone: 'empty' | 'building' | 'active'
  updated_at: string | null
  created_at: string | null
}

interface WorkspacesV1Props {
  initialQuery: string
  initialStatus: FilterKey
  workspaces: WorkspaceItem[]
}

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'empty', label: 'Needs setup' },
  { key: 'building', label: 'Building' },
  { key: 'active', label: 'Study ready' },
]

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: 'last_accessed', label: 'Last Accessed' },
  { key: 'name_asc', label: 'Name (A-Z)' },
  { key: 'lessons_desc', label: 'Most Lessons' },
  { key: 'docs_desc', label: 'Most Docs' },
]

function getStatusLabel(status: FilterKey) {
  switch (status) {
    case 'empty':
      return 'Needs setup'
    case 'building':
      return 'Building'
    case 'active':
      return 'Study ready'
    default:
      return 'All Workspaces'
  }
}

export function WorkspacesV1({ initialQuery, initialStatus, workspaces }: WorkspacesV1Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState(initialQuery)
  const [status, setStatus] = useState<FilterKey>(initialStatus)
  const [sort, setSort] = useState<SortKey>('last_accessed')

  const counts = useMemo(
    () => ({
      all: workspaces.length,
      empty: workspaces.filter((workspace) => workspace.statusTone === 'empty').length,
      building: workspaces.filter((workspace) => workspace.statusTone === 'building').length,
      active: workspaces.filter((workspace) => workspace.statusTone === 'active').length,
    }),
    [workspaces],
  )

  const filteredWorkspaces = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return workspaces.filter((workspace) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        workspace.name.toLowerCase().includes(normalizedQuery) ||
        workspace.summary.toLowerCase().includes(normalizedQuery) ||
        workspace.description?.toLowerCase().includes(normalizedQuery)

      const matchesStatus = status === 'all' || workspace.statusTone === status
      return matchesQuery && matchesStatus
    })
  }, [query, status, workspaces])

  const visibleWorkspaces = useMemo(() => {
    const sorted = [...filteredWorkspaces]

    sorted.sort((left, right) => {
      switch (sort) {
        case 'name_asc':
          return left.name.localeCompare(right.name)
        case 'lessons_desc':
          return right.lessonsCount - left.lessonsCount
        case 'docs_desc':
          return right.documentsCount - left.documentsCount
        case 'last_accessed':
        default: {
          const leftValue = left.updated_at ?? left.created_at ?? ''
          const rightValue = right.updated_at ?? right.created_at ?? ''
          return new Date(rightValue).getTime() - new Date(leftValue).getTime()
        }
      }
    })

    return sorted
  }, [filteredWorkspaces, sort])

  const hasWorkspaces = workspaces.length > 0
  const hasFiltersApplied = query.trim().length > 0 || status !== 'all'

  function syncUrl(nextQuery: string, nextStatus: FilterKey) {
    const params = new URLSearchParams()
    const trimmedQuery = nextQuery.trim()
    if (trimmedQuery) params.set('q', trimmedQuery)
    if (nextStatus !== 'all') params.set('status', nextStatus)
    const href = params.toString() ? `${pathname}?${params.toString()}` : pathname
    startTransition(() => router.replace(href))
  }

  function handleSearchChange(value: string) {
    setQuery(value)
    syncUrl(value, status)
  }

  function handleStatusChange(value: FilterKey) {
    setStatus(value)
    syncUrl(query, value)
  }

  function getSortLabel(value: SortKey) {
    return SORTS.find((sortOption) => sortOption.key === value)?.label ?? 'Last Accessed'
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto w-full max-w-[1400px] px-3 py-4 pb-20 sm:p-4 md:p-8">
        <div className="relative rounded-2xl md:rounded-[2.5rem] overflow-hidden p-4 sm:p-6 md:p-12 border border-border shadow-2xl bg-gradient-to-br from-accent to-secondary dark:from-card dark:to-card dark:bg-card group mb-6 sm:mb-8">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] bg-repeat pointer-events-none" />
          <div className="absolute top-0 right-0 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-gradient-to-b from-primary/20 dark:from-primary/10 via-primary/10 dark:via-primary/5 to-transparent rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[200px] md:w-[400px] h-[200px] md:h-[400px] bg-gradient-to-t from-primary/10 dark:from-primary/5 via-primary/10 dark:via-primary/5 to-transparent rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4 pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-4 max-w-2xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 w-fit"
              >
                <Command className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-primary tracking-wider uppercase">
                  Student Dashboard
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.1]"
              >
                Welcome to your <br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/70">
                  Learning H.Q.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-base sm:text-lg text-muted-foreground max-w-lg"
              >
                You have <span className="text-foreground font-medium">full control</span> over your
                education. Create workspaces, generate lessons, and master new concepts.
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col items-center gap-4"
            >
              <CreateWorkspaceModal
                trigger={
                  <div className="w-full md:w-auto">
                    <Button
                      size="lg"
                      className="w-full md:w-auto min-h-[48px] rounded-xl md:rounded-full h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/25 transition-all hover:scale-105 gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Create Workspace
                    </Button>
                  </div>
                }
              />

              <div className="relative w-24 h-24 hidden md:flex items-center justify-center">
                <div className="absolute inset-0 bg-primary/30 dark:bg-primary/20 rounded-full blur-xl animate-pulse" />
                <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 p-4 rounded-2xl border border-primary/20 shadow-inner backdrop-blur-md">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="mb-4 sm:mb-8 flex flex-col items-center justify-between gap-3 sm:gap-4 p-1 md:flex-row">
          <div className="relative w-full md:w-96 group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>
            <Input
              placeholder="Search your courses..."
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 bg-background border-input focus:border-primary/50 transition-all h-10 rounded-xl shadow-sm"
            />
          </div>

          <div className="flex flex-row items-center gap-2 md:gap-4 w-full md:w-auto">
            <details className="group/dropdown relative flex-1 md:flex-none md:w-auto">
              <summary className="flex h-10 w-full md:min-w-[180px] cursor-pointer list-none items-center justify-between rounded-md border border-input bg-background px-4 shadow-sm transition-colors hover:border-primary/30">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Filter className="h-4 w-4" />
                  <span className="text-foreground">{getStatusLabel(status)}</span>
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open/dropdown:rotate-180" />
              </summary>
              <div className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-xl">
                {FILTERS.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => handleStatusChange(filter.key)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
                      status === filter.key
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <span>{filter.label}</span>
                    <span className="text-xs">{counts[filter.key]}</span>
                  </button>
                ))}
              </div>
            </details>

            <details className="group/dropdown relative flex-1 md:flex-none md:w-auto">
              <summary className="flex h-10 w-full md:min-w-[180px] cursor-pointer list-none items-center justify-between rounded-md border border-input bg-background px-4 shadow-sm transition-colors hover:border-primary/30">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <ArrowUpDown className="h-4 w-4" />
                  <span className="text-foreground">{getSortLabel(sort)}</span>
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open/dropdown:rotate-180" />
              </summary>
              <div className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-xl">
                {SORTS.map((sortOption) => (
                  <button
                    key={sortOption.key}
                    type="button"
                    onClick={() => setSort(sortOption.key)}
                    className={cn(
                      'flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors',
                      sort === sortOption.key
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    {sortOption.label}
                  </button>
                ))}
              </div>
            </details>
          </div>
        </div>

        <div className="mb-6 sm:mb-8 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => handleStatusChange(filter.key)}
              className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                status === filter.key
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'surface-chip text-muted-foreground hover:text-foreground'
              }`}
            >
              {filter.label} ({counts[filter.key]})
            </button>
          ))}
        </div>

        {!hasWorkspaces ? (
          <div className="mx-auto max-w-2xl rounded-[32px] surface-panel p-6 sm:p-12 text-center md:p-16">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BookOpen className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-semibold text-foreground">Create your first workspace</h3>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-muted-foreground">
              Start with one course or exam track. Add your source material, let LEARN-X map the
              concepts, then turn that into lessons, flashcards, and a clear study queue.
            </p>
            <div className="mt-8 flex justify-center">
              <CreateWorkspaceModal />
            </div>
          </div>
        ) : visibleWorkspaces.length === 0 ? (
          hasFiltersApplied ? (
            <div className="surface-panel rounded-[28px] p-6 sm:p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <Sparkles className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-foreground">No matching workspaces</h3>
              <p className="mt-2 text-sm text-muted-foreground">Try adjusting your search terms.</p>
              <div className="mt-6">
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    setQuery('')
                    setStatus('all')
                    syncUrl('', 'all')
                  }}
                >
                  Clear filters
                </Button>
              </div>
            </div>
          ) : null
        ) : (
          <WorkspaceGrid workspaces={visibleWorkspaces} />
        )}

        {isPending && <div className="mt-4 text-sm text-muted-foreground">Updating…</div>}
      </div>
    </div>
  )
}

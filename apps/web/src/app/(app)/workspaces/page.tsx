import { redirect } from 'next/navigation'
import { createServerCaller } from '@/lib/trpc/server'
import { getWorkspaceOverviews } from '@/lib/workspace/get-workspace-overviews'
import { WorkspacesV1, type FilterKey } from './WorkspacesV1'

interface WorkspacesPageProps {
  searchParams: Promise<{ q?: string; status?: string }>
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'empty', label: 'Needs setup' },
  { key: 'building', label: 'Building' },
  { key: 'active', label: 'Study ready' },
] as const

export default async function WorkspacesPage({ searchParams }: WorkspacesPageProps) {
  const caller = await createServerCaller()
  const { q = '', status = 'all' } = await searchParams

  let workspaces: Awaited<ReturnType<typeof caller.workspace.list>> = []
  try {
    workspaces = await caller.workspace.list()
  } catch {
    redirect('/login')
  }

  const workspacesWithOverview = await getWorkspaceOverviews(caller, workspaces)
  const normalizedStatus: FilterKey = FILTERS.some((filter) => filter.key === status)
    ? (status as FilterKey)
    : 'all'

  return (
    <WorkspacesV1
      initialQuery={q}
      initialStatus={normalizedStatus}
      workspaces={workspacesWithOverview.map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
        description: workspace.description ?? null,
        status: workspace.status,
        total_token_count: workspace.total_token_count,
        documentsCount: workspace.documentsCount,
        conceptsCount: workspace.conceptsCount,
        lessonsCount: workspace.lessonsCount,
        completedLessonsCount: workspace.completedLessonsCount,
        progressLabel: workspace.progressLabel,
        summary: workspace.summary,
        tokenLabel: workspace.tokenLabel,
        nextActionLabel: workspace.nextActionLabel,
        nextActionHref: workspace.nextActionHref,
        statusTone: workspace.statusTone,
        updated_at: workspace.updated_at as string | null,
        created_at: workspace.created_at as string | null,
      }))}
    />
  )
}

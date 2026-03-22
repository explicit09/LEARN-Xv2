'use client'

import Link from 'next/link'
import { ArrowRight, Clock3, Folders, Plus, Target } from 'lucide-react'
import { CreateWorkspaceModal } from '@/components/workspace/CreateWorkspaceModal'
import { TiltCard } from '@/components/ui/TiltCard'
import { StaggerContainer, StaggerItem } from './DashboardAnimations'
import type { DashboardV1Props, WorkspaceOverviewCard } from './DashboardV1'

function formatRelativeDate(date?: string | null): string {
  if (!date) return 'New'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

type WorkspacesGalleryProps = Pick<DashboardV1Props, 'workspaces' | 'hasWorkspaces'>

export function WorkspacesGallery({ workspaces, hasWorkspaces }: WorkspacesGalleryProps) {
  return (
    <section>
      <div className="mb-4 sm:mb-6 px-1 sm:px-2 md:mb-8 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-bold text-foreground md:text-2xl">
          <Target className="h-5 w-5 text-primary md:h-6 md:w-6" />
          Active Workspaces
        </h2>
        <Link
          href="/workspaces"
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          View All
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {hasWorkspaces ? (
        <StaggerContainer className="flex overflow-x-auto gap-3 pb-4 snap-x snap-mandatory no-scrollbar md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-3 lg:gap-8">
          {workspaces.slice(0, 3).map((workspace) => (
            <WorkspaceCard key={workspace.id} workspace={workspace} />
          ))}

          {workspaces.length < 3 && (
            <StaggerItem className="snap-center min-w-[280px] shrink-0 md:min-w-0 md:shrink">
              <CreateWorkspaceModal
                trigger={
                  <div className="flex h-[180px] sm:h-[280px] cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-center transition-colors hover:border-primary/40 hover:bg-muted sm:p-5 md:p-6">
                    <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                      <Plus className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">Create New Workspace</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Start a new learning track
                      </p>
                    </div>
                  </div>
                }
              />
            </StaggerItem>
          )}
        </StaggerContainer>
      ) : (
        <div className="flex min-h-[280px] sm:min-h-[320px] flex-col items-center justify-center rounded-2xl sm:rounded-3xl border border-dashed border-border bg-muted/50 p-4 sm:p-8 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Target className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-2xl font-bold text-foreground">No Active Missions</h3>
          <p className="mt-2 max-w-md text-muted-foreground">
            Your dashboard is ready. Create a workspace to start generating lessons, reviews, and a
            guided study flow.
          </p>
          <div className="mt-8">
            <CreateWorkspaceModal />
          </div>
        </div>
      )}
    </section>
  )
}

function WorkspaceCard({ workspace }: { workspace: WorkspaceOverviewCard }) {
  const total = Math.max(workspace.lessonsCount, 1)
  const progress = Math.round((workspace.completedLessonsCount / total) * 100)
  const href = workspace.nextActionHref ?? `/workspace/${workspace.id}`

  return (
    <StaggerItem className="snap-center min-w-[280px] shrink-0 md:min-w-0 md:shrink">
      <TiltCard>
        <Link
          href={href}
          className="group flex h-[180px] sm:h-[280px] flex-col justify-between rounded-2xl border border-border bg-card p-3 shadow-sm transition-colors hover:border-primary/40 sm:p-5 md:p-6"
        >
          <div>
            <div className="mb-6 flex items-start justify-between">
              <div className="rounded-xl bg-primary/10 p-3 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Folders className="h-6 w-6" />
              </div>
              <div className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                {workspace.documentsCount} Docs
              </div>
            </div>
            <h3 className="line-clamp-2 mb-2 text-xl font-bold text-foreground transition-colors group-hover:text-primary md:text-2xl">
              {workspace.name}
            </h3>
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {workspace.description || 'Structured learning materials and generated study paths.'}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-xs font-medium text-muted-foreground">
              <span>Progress</span>
              <span className="text-foreground">{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5" />
                {formatRelativeDate(workspace.updatedAt)}
              </span>
              <span>{workspace.nextActionLabel ?? 'Open workspace'}</span>
            </div>
          </div>
        </Link>
      </TiltCard>
    </StaggerItem>
  )
}

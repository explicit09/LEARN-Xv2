import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { WorkspaceCard } from '@/components/workspace/WorkspaceCard'
import { CreateWorkspaceModal } from '@/components/workspace/CreateWorkspaceModal'
import { createServerCaller } from '@/lib/trpc/server'
import { BookOpen, Plus } from 'lucide-react'

export default async function WorkspacesPage() {
  const caller = await createServerCaller()

  let workspaces: Awaited<ReturnType<typeof caller.workspace.list>> = []
  try {
    workspaces = await caller.workspace.list()
  } catch {
    redirect('/login')
  }

  return (
    <>
      <Topbar title="Workspaces" actions={<CreateWorkspaceModal />} />
      <div className="flex-1 overflow-auto p-4 md:p-8 max-w-[1400px] mx-auto w-full">
        <div className="flex items-center justify-between mb-6 mt-4">
          <div>
            <h1 className="text-2xl font-bold">Your Workspaces</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {workspaces.length === 0
                ? 'Create a workspace to start learning'
                : `${workspaces.length} workspace${workspaces.length === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>

        {workspaces.length === 0 ? (
          <div className="glass-card rounded-3xl border border-dashed border-border p-16 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-muted mx-auto flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No workspaces yet</h3>
            <p className="text-muted-foreground mt-1 mb-6">
              Create a workspace to start uploading and mastering your course materials.
            </p>
            <CreateWorkspaceModal />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {workspaces.map((ws) => (
              <WorkspaceCard
                key={ws.id}
                id={ws.id}
                name={ws.name}
                description={ws.description}
                status={ws.status}
                totalTokenCount={ws.total_token_count}
                updatedAt={ws.updated_at as string | null}
                createdAt={ws.created_at as string | null}
              />
            ))}

            {/* Create New Card */}
            <div className="glass-card rounded-2xl border border-dashed border-border hover:border-primary/50 transition-colors flex items-center justify-center min-h-[140px] cursor-pointer group">
              <div className="text-center group-hover:-translate-y-1 transition-transform">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-2 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="font-medium text-sm text-muted-foreground group-hover:text-foreground">
                  New Workspace
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

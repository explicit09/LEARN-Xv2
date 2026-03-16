import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { WorkspaceCard } from '@/components/workspace/WorkspaceCard'
import { CreateWorkspaceModal } from '@/components/workspace/CreateWorkspaceModal'
import { createServerCaller } from '@/lib/trpc/server'

export default async function DashboardPage() {
  const caller = await createServerCaller()

  let profile
  try {
    profile = await caller.user.getProfile()
  } catch {
    redirect('/login')
  }

  if (!profile.onboarding_completed) {
    redirect('/onboarding')
  }

  const workspaces = await caller.workspace.list()

  return (
    <>
      <Topbar title="Dashboard" actions={<CreateWorkspaceModal />} />
      <div className="flex-1 p-6">
        {workspaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-sm font-medium">No workspaces yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a workspace to start uploading course materials.
            </p>
            <div className="mt-4">
              <CreateWorkspaceModal />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          </div>
        )}
      </div>
    </>
  )
}

'use client'

import { trpc } from '@/lib/trpc/client'

export default function MasteryPage() {
  const { data: workspaces, isLoading } = trpc.workspace.list.useQuery()

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Mastery</h1>
        <p className="text-muted-foreground mt-1">Your learning progress across all workspaces</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : !workspaces?.length ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-4xl mb-4">📚</div>
          <h2 className="text-lg font-semibold text-foreground">No workspaces yet</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Create a workspace and upload documents to track mastery.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {workspaces.map((ws) => (
            <WorkspaceMasteryCard key={ws.id} workspaceId={ws.id} workspaceName={ws.name} />
          ))}
        </div>
      )}
    </div>
  )
}

function WorkspaceMasteryCard({
  workspaceId,
  workspaceName,
}: {
  workspaceId: string
  workspaceName: string
}) {
  const { data: summary } = trpc.mastery.getWorkspaceSummary.useQuery({ workspaceId })

  const pct = summary?.totalConcepts
    ? Math.round((summary.mastered / summary.totalConcepts) * 100)
    : 0

  return (
    <div className="border border-border rounded-lg p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-foreground">{workspaceName}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {summary?.totalConcepts ?? 0} concepts
          </p>
        </div>
        <span className="text-lg font-bold text-primary">{pct}%</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="grid grid-cols-3 gap-4 mt-4 text-center">
        <div>
          <div className="text-sm font-semibold text-green-600">{summary?.mastered ?? 0}</div>
          <div className="text-xs text-muted-foreground">Mastered</div>
        </div>
        <div>
          <div className="text-sm font-semibold text-yellow-600">{summary?.struggling ?? 0}</div>
          <div className="text-xs text-muted-foreground">Struggling</div>
        </div>
        <div>
          <div className="text-sm font-semibold text-blue-600">{summary?.dueReviews ?? 0}</div>
          <div className="text-xs text-muted-foreground">Due reviews</div>
        </div>
      </div>
    </div>
  )
}

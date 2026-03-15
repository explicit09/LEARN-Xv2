'use client'

import { trpc } from '@/lib/trpc/client'
import { Topbar } from '@/components/layout/Topbar'

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
    </div>
  )
}

function AdminDashboard() {
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = trpc.admin.getUsageStats.useQuery()
  const { data: users, isLoading: usersLoading } = trpc.admin.listUsers.useQuery()

  if (statsError) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-sm font-medium text-destructive">
          {statsError.message.includes('Admin') ? 'Admin access required' : 'Failed to load stats'}
        </p>
        <p className="text-xs text-muted-foreground">Your account does not have the admin role.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Platform-wide usage metrics and user management
        </p>
      </div>

      {/* Stats grid */}
      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">
          Usage Statistics
        </h2>
        {statsLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Total Users" value={stats?.totalUsers ?? 0} />
            <StatCard label="Workspaces" value={stats?.totalWorkspaces ?? 0} />
            <StatCard label="Documents" value={stats?.totalDocuments ?? 0} />
            <StatCard label="AI Requests (30d)" value={stats?.aiRequests30d ?? 0} />
          </div>
        )}
      </section>

      {/* User list */}
      <section aria-labelledby="users-heading">
        <h2 id="users-heading" className="mb-3 text-base font-semibold">
          Users ({users?.length ?? 0})
        </h2>
        {usersLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : !users?.length ? (
          <p className="text-sm text-muted-foreground">No users found.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm" role="grid" aria-label="User list">
              <thead className="bg-muted/50">
                <tr>
                  <th scope="col" className="px-4 py-2.5 text-left font-medium">
                    User
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-left font-medium">
                    Email
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-left font-medium">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t hover:bg-accent/30">
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs text-muted-foreground">
                        {u.id.slice(0, 8)}…
                      </span>
                      {u.displayName && <span className="ml-2 font-medium">{u.displayName}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default function AdminPage() {
  return (
    <>
      <Topbar title="Admin" />
      <div className="flex-1 p-6">
        <div className="mx-auto max-w-5xl">
          <AdminDashboard />
        </div>
      </div>
    </>
  )
}

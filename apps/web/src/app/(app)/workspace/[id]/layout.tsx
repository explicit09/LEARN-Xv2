import { notFound } from 'next/navigation'
import { createServerCaller } from '@/lib/trpc/server'

interface WorkspaceLayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default async function WorkspaceLayout({ children, params }: WorkspaceLayoutProps) {
  const { id } = await params
  const caller = await createServerCaller()

  try {
    await caller.workspace.get({ id })
  } catch {
    notFound()
  }

  return <>{children}</>
}

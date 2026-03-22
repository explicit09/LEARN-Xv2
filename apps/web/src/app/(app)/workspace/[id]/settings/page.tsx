import { redirect } from 'next/navigation'

interface WorkspaceSettingsPageProps {
  params: Promise<{ id: string }>
}

export default async function WorkspaceSettingsPage({ params }: WorkspaceSettingsPageProps) {
  const { id } = await params
  redirect(`/workspace/${id}?tab=overview`)
}

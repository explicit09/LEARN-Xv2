import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ id: string }>
}

export default async function NewChatPage({ params }: Props) {
  const { id: workspaceId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get internal user ID
  const { data: userRow } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single()
  if (!userRow) redirect('/login')

  // Create new session
  const { data: session, error } = await supabase
    .from('chat_sessions')
    .insert({ workspace_id: workspaceId, user_id: userRow.id })
    .select('id')
    .single()

  if (error ?? !session) {
    redirect(`/workspace/${workspaceId}?tab=chat`)
  }

  redirect(`/workspace/${workspaceId}/chat/${session.id}`)
}

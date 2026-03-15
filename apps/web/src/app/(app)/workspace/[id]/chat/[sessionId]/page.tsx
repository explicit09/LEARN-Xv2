import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { ChatSessionList } from '@/components/chat/ChatSessionList'

interface Props {
  params: Promise<{ id: string; sessionId: string }>
}

export default async function ChatSessionPage({ params }: Props) {
  const { id: workspaceId, sessionId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify workspace ownership
  const { data: userRow } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single()
  if (!userRow) redirect('/login')

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('id', workspaceId)
    .eq('user_id', userRow.id)
    .single()
  if (!workspace) redirect('/dashboard')

  // Load session + messages
  const { data: session } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('workspace_id', workspaceId)
    .single()
  if (!session) redirect(`/workspace/${workspaceId}`)

  const { data: messages } = await supabase
    .from('chat_messages')
    .select('id, role, content, cited_chunk_ids')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  const typedMessages = (messages ?? []) as {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    cited_chunk_ids: string[] | null
  }[]

  return (
    <div className="flex h-full">
      {/* Session list sidebar */}
      <aside className="w-56 border-r border-border flex-shrink-0 overflow-y-auto">
        <div className="p-3 border-b border-border">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Chat History
          </p>
        </div>
        <ChatSessionList workspaceId={workspaceId} activeSessionId={sessionId} />
      </aside>

      {/* Chat area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="px-4 py-3 border-b border-border flex-shrink-0">
            <p className="text-sm font-medium">{workspace.name as string}</p>
            <p className="text-xs text-muted-foreground">Grounded chat</p>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatInterface
              sessionId={sessionId}
              workspaceId={workspaceId}
              initialMessages={typedMessages}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

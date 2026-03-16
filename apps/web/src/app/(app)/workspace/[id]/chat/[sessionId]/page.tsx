import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { FileText, ChevronLeft, Plus, LogOut, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@learn-x/ui'

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
    <div className="flex flex-col h-full bg-background overflow-hidden">
      
      {/* Top Header */}
      <header className="h-16 border-b border-border/50 bg-background/80 backdrop-blur-xl shrink-0 flex items-center justify-between px-6 z-20 sticky top-0">
        <div className="flex items-center gap-4">
          <Link href={`/workspace/${workspaceId}`} className="text-muted-foreground hover:text-foreground transition-colors p-2 -ml-2 rounded-lg hover:bg-muted/50">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <h1 className="font-bold text-lg">{workspace.name as string}</h1>
          <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
            AI Coach
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" className="hidden sm:inline-flex h-9 rounded-lg border-border bg-transparent hover:bg-muted/50 font-semibold text-xs">
            <Plus className="w-4 h-4 mr-1.5" />
            New Chat
          </Button>
          <Button variant="destructive" className="h-9 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 font-semibold text-xs shadow-none">
            End Session
            <LogOut className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden min-h-0 relative">
        
        {/* Left Sidebar - Sources */}
        <aside className="w-80 border-r border-border/50 bg-card/30 flex-shrink-0 flex flex-col hidden lg:flex">
          <div className="p-6 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Sources</h2>
            
            {/* Mock Sources List */}
            <div className="space-y-3">
              {/* High Relevance */}
              <div className="group rounded-xl p-3 bg-muted/30 border border-border/50 hover:bg-muted/50 hover:border-border transition-colors cursor-pointer relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                <div className="flex justify-between items-start mb-2 pl-2">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-500 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> High Relevance
                  </span>
                  <span className="text-xs text-muted-foreground">98% match</span>
                </div>
                <div className="pl-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold truncate">Mechanics_Textbook.pdf</span>
                </div>
              </div>

              {/* Medium Relevance */}
              <div className="group rounded-xl p-3 bg-muted/30 border border-border/50 hover:bg-muted/50 hover:border-border transition-colors cursor-pointer relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500" />
                <div className="flex justify-between items-start mb-2 pl-2">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-yellow-500">
                    Medium Relevance
                  </span>
                  <span className="text-xs text-muted-foreground">64% match</span>
                </div>
                <div className="pl-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold truncate">Lecture_Slides_Week_4.pdf</span>
                </div>
              </div>
            </div>
            
          </div>
        </aside>

        {/* Chat Area */}
        <main className="flex-1 min-w-0 bg-background relative flex flex-col">
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
          
          <ChatInterface
            sessionId={sessionId}
            workspaceId={workspaceId}
            initialMessages={typedMessages}
          />
        </main>
        
      </div>
    </div>
  )
}

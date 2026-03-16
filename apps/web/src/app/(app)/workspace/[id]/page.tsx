import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { WorkspaceDocuments } from '@/components/document/WorkspaceDocuments'
import { ConceptList } from '@/components/concept/ConceptList'
import { LessonList } from '@/components/lesson/LessonList'
import { SyllabusView } from '@/components/syllabus/SyllabusView'
import { MasteryDashboard } from '@/components/mastery/MasteryDashboard'
import { createServerCaller } from '@/lib/trpc/server'
import { BookOpen, Map, GraduationCap, Flame, Sparkles, BrainCircuit, ActivitySquare, Layers } from 'lucide-react'
import { Button } from '@learn-x/ui'

interface WorkspacePageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

const TABS = [
  { key: 'documents', label: 'Documents', icon: BookOpen },
  { key: 'concepts', label: 'Concepts', icon: BrainCircuit },
  { key: 'syllabus', label: 'Syllabus', icon: Map },
  { key: 'lessons', label: 'Lessons', icon: GraduationCap },
  { key: 'mastery', label: 'Mastery', icon: ActivitySquare },
  { key: 'chat', label: 'AI Chat', icon: Sparkles },
  { key: 'quiz', label: 'Quizzes', icon: Flame },
  { key: 'flashcards', label: 'Flashcards', icon: Layers },
] as const

type TabKey = (typeof TABS)[number]['key'] | 'exam' | 'graph' | 'flashcards'

export default async function WorkspacePage({ params, searchParams }: WorkspacePageProps) {
  const { id } = await params
  const { tab } = await searchParams
  
  // Cast to the expanded TabKey type to allow checking for redirect pages
  const activeTab: TabKey = tab as TabKey || 'documents'

  const caller = await createServerCaller()

  let workspace
  try {
    workspace = await caller.workspace.get({ id })
  } catch {
    notFound()
  }

  // Auto-redirect tabs that have dedicated full pages
  if (activeTab === 'chat') redirect(`/workspace/${id}/chat`)
  if (activeTab === 'exam') redirect(`/workspace/${id}/exam`)
  if (activeTab === 'graph') redirect(`/workspace/${id}/graph`)
  if (activeTab === 'quiz') redirect(`/workspace/${id}/quiz`)

  const documents = await caller.document.list({ workspaceId: id }).catch(() => [])
  const hasDocuments = documents.length > 0

  return (
    <>
      <Topbar title={workspace.name as string} />
      <div className="flex-1 overflow-auto p-4 md:p-8 flex flex-col gap-6 max-w-[1400px] mx-auto w-full">
        
        {/* Header Block */}
        <div className="relative overflow-hidden rounded-3xl glass-card border border-border/50 p-6 md:p-10 mb-2 mt-4 shadow-sm group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-primary/20 transition-colors duration-1000" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                 <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                   <BookOpen className="w-4 h-4" />
                 </div>
                 <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Workspace</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground mb-2">
                {workspace.name as string}
              </h1>
              {workspace.description && (
                <p className="text-muted-foreground text-lg max-w-2xl">
                  {workspace.description as string}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
               <div className="bg-card/50 backdrop-blur-md rounded-2xl p-4 border border-border/50 flex flex-col items-center min-w-[100px]">
                 <span className="text-2xl font-black text-foreground">{(workspace.total_token_count as number / 1000).toFixed(0)}k</span>
                 <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tokens</span>
               </div>
               <div className="bg-primary/10 rounded-2xl p-4 border border-primary/20 flex flex-col items-center min-w-[100px]">
                 <span className="text-2xl font-black text-primary">Active</span>
                 <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Status</span>
               </div>
            </div>
          </div>
        </div>

        {/* Floating Pill Tab Bar */}
        <div className="flex items-center gap-2 bg-muted/40 backdrop-blur-md p-1.5 rounded-2xl border border-border/50 overflow-x-auto custom-scrollbar">
          {TABS.map((t) => {
            const Icon = t.icon
            const isActive = activeTab === t.key
            return (
              <Link
                key={t.key}
                href={`/workspace/${id}?tab=${t.key}`}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-card shadow-sm border border-border/50 text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : ''}`} />
                {t.label}
              </Link>
            )
          })}
        </div>

        {/* Main Content Area */}
        <div className="bg-background rounded-3xl pb-12 mt-4 min-h-[500px]">
          {activeTab === 'documents' && <WorkspaceDocuments workspaceId={id} />}
          {activeTab === 'concepts' && <ConceptList workspaceId={id} />}
          {activeTab === 'syllabus' && <SyllabusView workspaceId={id} hasDocuments={hasDocuments} />}
          {activeTab === 'lessons' && <LessonList workspaceId={id} />}
          {activeTab === 'mastery' && <MasteryDashboard workspaceId={id} />}

          {/* Flashcards generic view fallback */}
          {activeTab === 'flashcards' && (
             <div className="flex flex-col items-center justify-center min-h-[400px] text-center glass-card rounded-3xl border border-border/50">
               <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                 <ActivitySquare className="w-8 h-8" />
               </div>
               <h2 className="text-2xl font-bold mb-2">Spaced Repetition Review</h2>
               <p className="text-muted-foreground max-w-sm mb-8">
                 Master your concepts by reviewing them at the perfect interval.
               </p>
               <Button asChild size="lg" className="rounded-xl px-8 font-bold shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                 <Link href={`/workspace/${id}/flashcards`}>Start Review Session</Link>
               </Button>
             </div>
          )}
        </div>
      </div>
    </>
  )
}

import type { ReactNode } from 'react'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { WorkspaceDocuments } from '@/components/document/WorkspaceDocuments'
import { LessonsTab } from '@/components/lesson/LessonsTab'
import { SyllabusView } from '@/components/syllabus/SyllabusView'
import { MasteryDashboard } from '@/components/mastery/MasteryDashboard'
import { FlashcardSetList } from '@/components/flashcard/FlashcardSetList'
import { QuizList } from '@/components/quiz/QuizList'
import { ExamList } from '@/components/exam/ExamList'
import { WorkspaceChatTab } from '@/components/chat/WorkspaceChatTab'
import { PipelineActivityFeed } from '@/components/pipeline/PipelineActivityFeed'
import { WorkspaceCompletionListener } from '@/components/pipeline/WorkspaceCompletionListener'
import { createServerCaller } from '@/lib/trpc/server'
import {
  ActivitySquare,
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  BrainCircuit,
  ChevronLeft,
  ClipboardCheck,
  GraduationCap,
  Headphones,
  ListTree,
  MessageSquare,
  Settings,
} from 'lucide-react'
import { Button, SpatialStatCard } from '@learn-x/ui'
import { cn } from '@learn-x/utils'

function OverviewSection({
  eyebrow,
  title,
  body,
  actionHref,
  actionLabel,
  children,
}: {
  eyebrow: string
  title: string
  body: string
  actionHref?: string | undefined
  actionLabel?: string | undefined
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-[32px] border border-border/60 bg-card/70 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border/60 px-5 py-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
            {eyebrow}
          </p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-foreground">{title}</h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">{body}</p>
        </div>
        {actionHref && actionLabel ? (
          <Button asChild variant="outline" className="rounded-xl">
            <Link href={actionHref}>
              {actionLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : null}
      </div>
      <div>{children}</div>
    </section>
  )
}

interface WorkspacePageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

const TABS = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'lessons', label: 'Lessons', icon: BookOpen },
  { key: 'syllabus', label: 'Syllabus', icon: ListTree },
  { key: 'chat', label: 'Chat', icon: MessageSquare },
  { key: 'flashcards', label: 'Flashcards', icon: Brain },
  { key: 'quiz', label: 'Quiz', icon: ClipboardCheck },
  { key: 'exams', label: 'Exams', icon: GraduationCap },
  { key: 'audio', label: 'Podcasts', icon: Headphones },
] as const

type TabKey = (typeof TABS)[number]['key'] | 'exam' | 'graph'

export default async function WorkspacePage({ params, searchParams }: WorkspacePageProps) {
  const { id } = await params
  const { tab } = await searchParams
  const activeTab: TabKey = (tab as TabKey) || 'overview'

  const caller = await createServerCaller()

  let workspace
  try {
    workspace = await caller.workspace.get({ id })
  } catch {
    notFound()
  }

  // Chat now renders inline — no redirect needed
  // Exams now render inline
  if (activeTab === 'graph') redirect(`/workspace/${id}/graph`)
  // Quiz now renders inline
  if (activeTab === 'audio') redirect('/podcasts')

  const documents = await caller.document.list({ workspaceId: id }).catch(() => [])
  const [concepts, lessons, masterySummary] = await Promise.all([
    caller.concept.list({ workspaceId: id }).catch(() => []),
    caller.lesson.list({ workspaceId: id }).catch(() => []),
    caller.mastery.getWorkspaceSummary({ workspaceId: id }).catch(() => null),
  ])
  const hasDocuments = documents.length > 0
  const lessonCount = lessons.length
  const documentCount = documents.length
  const conceptCount = concepts.length
  const completedLessons = lessons.filter((lesson) => lesson.is_completed).length
  const tokenCount =
    typeof workspace.total_token_count === 'number' ? workspace.total_token_count : 0
  const tokenLabel = `${Math.max(0, Math.round(tokenCount / 1000))}k`
  const masteryLabel = `${Math.round(masterySummary?.avgMastery ?? 0)}%`
  const workspaceName = (workspace.name as string) || 'Untitled Workspace'
  const workspaceDescription =
    (workspace.description as string | null) ||
    'Structured learning materials and generated study paths.'

  return (
    <div className="fixed inset-0 overflow-hidden bg-background flex flex-col">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-pink-50/30 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-pink-950/20" />

      <div className="relative z-10 border-b border-gray-200/80 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/80">
        <div className="container mx-auto max-w-[1600px] px-4 py-1.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/workspaces"
                className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>

              <div className="flex min-w-0 items-center gap-2">
                <BookOpen className="h-4 w-4 shrink-0 text-primary" />
                <h1 className="truncate text-sm font-bold text-gray-900 dark:text-white">
                  {workspaceName}
                </h1>
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  · {lessonCount} lessons · {documentCount} docs
                </span>
              </div>
            </div>

            <Link
              href={`/workspace/${id}/settings`}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto flex flex-1 min-h-0 w-full max-w-[1600px] flex-col">
        <div className="flex h-full flex-col overflow-hidden border-x border-b border-gray-200 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/90">
          <div className="shrink-0 border-b border-gray-200 bg-white/50 px-2 dark:border-white/10 dark:bg-gray-900/50 sm:px-4">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1.5">
              {TABS.map((tabItem) => {
                const Icon = tabItem.icon
                const isActive = activeTab === tabItem.key

                return (
                  <Link
                    key={tabItem.key}
                    href={`/workspace/${id}?tab=${tabItem.key}`}
                    className={cn(
                      'relative flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all',
                      isActive
                        ? 'text-primary'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                    )}
                  >
                    <Icon className={cn('h-4 w-4', isActive && 'text-primary')} />
                    <span>{tabItem.label}</span>
                    {isActive && (
                      <span className="absolute inset-0 -z-10 rounded-lg border border-primary/20 bg-primary/10" />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            {/* Global listener for lesson completion toasts */}
            <WorkspaceCompletionListener workspaceId={id} />

            {activeTab === 'overview' && (
              <div className="space-y-8 p-4 sm:p-6">
                {/* Pipeline activity feed — shows while building */}
                {hasDocuments && <PipelineActivityFeed workspaceId={id} />}

                {/* Getting started — empty workspace */}
                {!hasDocuments && (
                  <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-primary/30 bg-primary/[0.03] p-12 text-center">
                    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner border border-primary/20">
                      <BookOpen className="h-8 w-8" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight mb-2">
                      Welcome to {workspaceName}
                    </h2>
                    <p className="text-muted-foreground max-w-md mb-1">
                      Upload your course materials — lecture notes, textbooks, slides — and
                      we&apos;ll generate a personalized learning path with lessons, quizzes, and
                      flashcards.
                    </p>
                    <p className="text-xs text-muted-foreground/70 mb-8">
                      PDF, DOCX, PPTX, TXT, and URLs supported
                    </p>
                    <WorkspaceDocuments workspaceId={id} />
                  </div>
                )}

                {/* Stats — only show when workspace has content */}
                {hasDocuments && (
                  <>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <SpatialStatCard
                        label="Documents"
                        value={documentCount}
                        sublabel={documentCount === 1 ? 'Source uploaded' : 'Sources uploaded'}
                        icon={<BookOpen className="h-5 w-5" />}
                        color="primary"
                      />
                      <SpatialStatCard
                        label="Lessons"
                        value={lessonCount}
                        sublabel={`${completedLessons} completed`}
                        icon={<GraduationCap className="h-5 w-5" />}
                        color="indigo"
                      />
                      <SpatialStatCard
                        label="Concepts"
                        value={conceptCount}
                        sublabel={
                          conceptCount > 0 ? 'Knowledge graph ready' : 'Waiting for extraction'
                        }
                        icon={<BrainCircuit className="h-5 w-5" />}
                        color="orange"
                      />
                      <SpatialStatCard
                        label="Mastery"
                        value={masteryLabel}
                        sublabel={`${masterySummary?.dueReviews ?? 0} due reviews`}
                        icon={<ActivitySquare className="h-5 w-5" />}
                        color="emerald"
                      />
                    </div>

                    <OverviewSection
                      eyebrow="Materials"
                      title="Source documents and ingestion"
                      body="Upload and manage the material this workspace uses to generate concepts, lessons, and downstream study tools."
                    >
                      <WorkspaceDocuments workspaceId={id} />
                    </OverviewSection>

                    <OverviewSection
                      eyebrow="Mastery"
                      title="What to study next"
                      body="Review weak concepts, see due reviews, and use mastery signals to decide the next highest-value action."
                      actionHref={`/workspace/${id}/flashcards`}
                      actionLabel="Open Flashcards"
                    >
                      <MasteryDashboard workspaceId={id} />
                    </OverviewSection>
                  </>
                )}
              </div>
            )}

            {activeTab === 'lessons' && <LessonsTab workspaceId={id} />}
            {activeTab === 'syllabus' && (
              <SyllabusView workspaceId={id} hasDocuments={hasDocuments} />
            )}

            {activeTab === 'chat' && <WorkspaceChatTab workspaceId={id} />}

            {activeTab === 'flashcards' && (
              <div className="flex-1 overflow-auto p-4 md:p-8 flex flex-col gap-6 max-w-[1400px] mx-auto w-full">
                <FlashcardSetList workspaceId={id} />
              </div>
            )}

            {activeTab === 'quiz' && (
              <div className="flex-1 overflow-auto p-4 md:p-8 flex flex-col gap-6 max-w-[1400px] mx-auto w-full">
                <QuizList workspaceId={id} />
              </div>
            )}

            {(activeTab === 'exams' || activeTab === 'exam') && (
              <div className="flex-1 overflow-auto p-4 md:p-8 flex flex-col gap-6 max-w-[1400px] mx-auto w-full">
                <ExamList workspaceId={id} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

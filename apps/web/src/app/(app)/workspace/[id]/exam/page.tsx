'use client'

import { use } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc/client'
import { BookOpen, ChevronLeft, ClipboardCheck } from 'lucide-react'
import { Button } from '@learn-x/ui'

interface ExamPageProps {
  params: Promise<{ id: string }>
}

function ExamStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    active: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
    closed: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  }
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        colors[status] ?? colors.draft,
      ].join(' ')}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function ExamList({ workspaceId }: { workspaceId: string }) {
  const { data: exams, isLoading, refetch } = trpc.exam.list.useQuery({ workspaceId })
  const generateMutation = trpc.exam.generate.useMutation({
    onSuccess: () => refetch(),
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Exams</h2>
          <p className="text-sm text-muted-foreground">
            Formal timed assessments with Bloom&apos;s-tagged questions
          </p>
        </div>
        <button
          onClick={() => generateMutation.mutate({ workspaceId })}
          disabled={generateMutation.isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-opacity"
          aria-label="Generate new exam"
        >
          {generateMutation.isPending ? 'Generating…' : 'Generate Exam'}
        </button>
      </div>

      {generateMutation.isSuccess && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
          Exam generation started. It will appear below when ready.
        </div>
      )}

      {!exams?.length ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <p className="text-sm text-muted-foreground">No exams yet</p>
          <p className="text-xs text-muted-foreground">
            Generate your first exam to test your knowledge formally
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {exams.map((exam) => (
            <li
              key={exam.id}
              className="rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-medium">{exam.title}</h3>
                    <ExamStatusBadge status={exam.status} />
                  </div>
                  {exam.description && (
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {exam.description}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    {exam.time_limit_minutes && (
                      <span>{exam.time_limit_minutes} min time limit</span>
                    )}
                    <span>{new Date(exam.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <Link
                  href={`/workspace/${workspaceId}/exam/${exam.id}`}
                  className="shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
                  aria-label={`Take exam: ${exam.title}`}
                >
                  Take Exam
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function ExamPage({ params }: ExamPageProps) {
  const { id } = use(params)
  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/40 via-purple-50/20 to-pink-50/20 dark:from-blue-950/20 dark:via-purple-950/10 dark:to-pink-950/10" />
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href={`/workspace/${id}?tab=overview`}
              className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back</span>
            </Link>
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-blue-500 dark:text-blue-400">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground">
                  Workspace Exam
                </p>
                <h1 className="text-xl font-bold">Assessments</h1>
              </div>
            </div>
          </div>

          <Button asChild variant="outline" className="rounded-xl">
            <Link href={`/workspace/${id}?tab=overview`}>Return to Workspace</Link>
          </Button>
        </div>

        <div className="rounded-[28px] border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur-sm sm:p-8">
          <div className="mb-6">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              <ClipboardCheck className="h-3.5 w-3.5" />
              Formal Review
            </div>
            <p className="text-sm text-muted-foreground sm:text-base">
              Generate timed assessments from this workspace and measure what still needs work.
            </p>
          </div>
          <ExamList workspaceId={id} />
        </div>
      </div>
    </div>
  )
}

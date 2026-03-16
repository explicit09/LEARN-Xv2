'use client'

import { use } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc/client'

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
    <div className="mx-auto max-w-3xl">
      <ExamList workspaceId={id} />
    </div>
  )
}

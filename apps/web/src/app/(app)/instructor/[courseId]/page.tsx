'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc/client'
import { Topbar } from '@/components/layout/Topbar'

interface CourseDetailPageProps {
  params: Promise<{ courseId: string }>
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
      aria-label={label}
    >
      {copied ? (
        <>
          <svg
            className="h-3.5 w-3.5 text-green-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copy join code
        </>
      )}
    </button>
  )
}

function CourseDetail({ courseId }: { courseId: string }) {
  const { data: course, isLoading } = trpc.course.get.useQuery({ courseId })
  const { data: confusion } = trpc.course.getConfusionAnalytics.useQuery({ courseId })
  const { data: atRisk } = trpc.course.getAtRiskStudents.useQuery({ courseId })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-muted-foreground">Course not found</p>
        <Link href="/instructor" className="text-sm text-primary hover:underline">
          Back to instructor
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{course.title}</h1>
          {course.description && (
            <p className="mt-1 text-sm text-muted-foreground">{course.description}</p>
          )}
        </div>
        <CopyButton text={course.joinCode} label={`Copy join code: ${course.joinCode}`} />
      </div>

      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3">
        <span className="text-sm text-muted-foreground">Join code:</span>
        <code className="text-lg font-bold tracking-widest text-foreground">{course.joinCode}</code>
        <Link
          href={`/instructor/${courseId}/join`}
          className="ml-auto text-xs text-primary hover:underline"
        >
          Share join page
        </Link>
      </div>

      {/* Student roster */}
      <section aria-labelledby="students-heading">
        <h2 id="students-heading" className="mb-3 text-base font-semibold">
          Students ({course.enrolledStudents.length})
        </h2>
        {!course.enrolledStudents.length ? (
          <p className="text-sm text-muted-foreground">
            No students enrolled yet. Share the join code above.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm" role="grid" aria-label="Student roster">
              <thead className="bg-muted/50">
                <tr>
                  <th scope="col" className="px-4 py-2.5 text-left font-medium">
                    Student
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-left font-medium">
                    Enrolled
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-left font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {course.enrolledStudents.map((s) => {
                  const isAtRiskStudent = atRisk?.some((r) => r.userId === s.userId)
                  return (
                    <tr key={s.userId} className="border-t hover:bg-accent/30">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{s.userId.slice(0, 8)}…</span>
                          {isAtRiskStudent && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                              At risk
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {new Date(s.enrolledAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
                          Active
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Concept confusion heatmap */}
      {confusion && confusion.length > 0 && (
        <section aria-labelledby="confusion-heading">
          <h2 id="confusion-heading" className="mb-3 text-base font-semibold">
            Concept Confusion
          </h2>
          <div className="space-y-2" role="list" aria-label="Concept mastery levels">
            {confusion.map((c) => (
              <div
                key={c.conceptId}
                className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3"
                role="listitem"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{c.conceptName}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.studentCount} student{c.studentCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                    <div
                      className={[
                        'h-full rounded-full',
                        c.avgMastery >= 0.8
                          ? 'bg-green-500'
                          : c.avgMastery >= 0.5
                            ? 'bg-yellow-500'
                            : 'bg-red-500',
                      ].join(' ')}
                      style={{ width: `${c.avgMastery * 100}%` }}
                      role="progressbar"
                      aria-valuenow={Math.round(c.avgMastery * 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Average mastery: ${Math.round(c.avgMastery * 100)}%`}
                    />
                  </div>
                  <span className="text-sm tabular-nums">{Math.round(c.avgMastery * 100)}%</span>
                  {c.isStruggling && (
                    <span
                      className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300"
                      role="status"
                    >
                      Struggling
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Documents */}
      <section aria-labelledby="documents-heading">
        <h2 id="documents-heading" className="mb-3 text-base font-semibold">
          Course Documents ({course.documentIds.length})
        </h2>
        {!course.documentIds.length ? (
          <p className="text-sm text-muted-foreground">No documents linked to this course yet.</p>
        ) : (
          <ul className="space-y-1.5" role="list">
            {course.documentIds.map((docId) => (
              <li
                key={docId}
                className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm"
              >
                <svg
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="truncate font-mono text-xs text-muted-foreground">{docId}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { courseId } = use(params)
  return (
    <>
      <Topbar title="Course Detail" />
      <div className="flex-1 p-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4">
            <Link
              href="/instructor"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to instructor
            </Link>
          </div>
          <CourseDetail courseId={courseId} />
        </div>
      </div>
    </>
  )
}

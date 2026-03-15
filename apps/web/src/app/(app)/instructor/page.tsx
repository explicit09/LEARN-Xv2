'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc/client'
import { Topbar } from '@/components/layout/Topbar'

function CreateCourseModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const createMutation = trpc.course.create.useMutation({
    onSuccess: () => {
      onCreated()
      onClose()
    },
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-course-title"
    >
      <div className="mx-4 w-full max-w-md rounded-xl border bg-background p-6 shadow-xl">
        <h2 id="create-course-title" className="text-lg font-semibold">
          Create Course
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Students can join using a code you share.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="course-title" className="text-sm font-medium">
              Course Title
            </label>
            <input
              id="course-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Introduction to Machine Learning"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="course-description" className="text-sm font-medium">
              Description (optional)
            </label>
            <textarea
              id="course-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief course description…"
              rows={3}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
        </div>

        <div className="mt-5 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="rounded-md border px-4 py-2 text-sm hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => createMutation.mutate({ title, description: description || undefined })}
            disabled={!title.trim() || createMutation.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-opacity"
          >
            {createMutation.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

function InstructorDashboard() {
  const { data: courses, isLoading, refetch } = trpc.course.list.useQuery()
  const [showCreate, setShowCreate] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Instructor Dashboard</h1>
          <p className="text-sm text-muted-foreground">Manage your courses and student progress</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-opacity"
          aria-label="Create new course"
        >
          Create course
        </button>
      </div>

      {!courses?.length ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <svg
            className="h-10 w-10 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <p className="text-sm font-medium">No courses yet</p>
          <p className="text-xs text-muted-foreground">
            Create your first course to invite students
          </p>
        </div>
      ) : (
        <ul className="space-y-3" role="list">
          {courses.map((course) => (
            <li
              key={course.id}
              className="rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate font-medium">{course.title}</h2>
                    <span
                      className={[
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        course.status === 'active'
                          ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                          : 'bg-muted text-muted-foreground',
                      ].join(' ')}
                    >
                      {course.status}
                    </span>
                  </div>
                  {course.description && (
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {course.description}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      {course.studentCount} student{course.studentCount !== 1 ? 's' : ''}
                    </span>
                    <span>
                      Code:{' '}
                      <code className="font-mono font-semibold text-foreground">
                        {course.joinCode}
                      </code>
                    </span>
                  </div>
                </div>
                <Link
                  href={`/instructor/${course.id}`}
                  className="shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
                  aria-label={`View course: ${course.title}`}
                >
                  View
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showCreate && (
        <CreateCourseModal onClose={() => setShowCreate(false)} onCreated={() => refetch()} />
      )}
    </div>
  )
}

export default function InstructorPage() {
  return (
    <>
      <Topbar title="Instructor" />
      <div className="flex-1 p-6">
        <div className="mx-auto max-w-3xl">
          <InstructorDashboard />
        </div>
      </div>
    </>
  )
}

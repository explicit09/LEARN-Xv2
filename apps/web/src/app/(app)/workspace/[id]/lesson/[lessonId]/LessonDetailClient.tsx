'use client'

import Link from 'next/link'
import { trpc } from '@/lib/trpc/client'
import { LessonRenderer } from '@/components/lesson/LessonRenderer'
import type { LessonSection } from '@learn-x/validators'

interface LessonDetailClientProps {
  workspaceId: string
  lessonId: string
}

export function LessonDetailClient({ workspaceId, lessonId }: LessonDetailClientProps) {
  const {
    data: lesson,
    isLoading,
    error,
  } = trpc.lesson.get.useQuery({
    id: lessonId,
    workspaceId,
  })
  const { data: allLessons } = trpc.lesson.list.useQuery({ workspaceId })
  const utils = trpc.useUtils()

  const markComplete = trpc.lesson.markComplete.useMutation({
    onSuccess: () => {
      void utils.lesson.get.invalidate({ id: lessonId, workspaceId })
      void utils.lesson.list.invalidate({ workspaceId })
    },
  })

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded w-1/2" />
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-4 bg-muted animate-pulse rounded"
              style={{ width: `${70 + i * 5}%` }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (error || !lesson) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 text-center">
        <p className="text-sm text-muted-foreground">Lesson not found.</p>
        <Link
          href={`/workspace/${workspaceId}?tab=lessons`}
          className="text-sm text-foreground underline mt-2 inline-block"
        >
          Back to lessons
        </Link>
      </div>
    )
  }

  // prev/next navigation
  const sortedLessons = (allLessons ?? []).sort(
    (a, b) => (a.order_index as number) - (b.order_index as number),
  )
  const currentIndex = sortedLessons.findIndex((l) => l.id === lessonId)
  const prevLesson = currentIndex > 0 ? sortedLessons[currentIndex - 1] : null
  const nextLesson =
    currentIndex < sortedLessons.length - 1 ? sortedLessons[currentIndex + 1] : null

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      {/* Back link */}
      <Link
        href={`/workspace/${workspaceId}?tab=lessons`}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Back to lessons
      </Link>

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{lesson.title}</h1>
        {lesson.summary && <p className="text-sm text-muted-foreground">{lesson.summary}</p>}
      </div>

      {/* Lesson content */}
      <LessonRenderer sections={lesson.structuredSections as LessonSection[]} />

      {/* Mark complete + nav */}
      <div className="border-t border-border pt-6 flex items-center justify-between gap-4">
        <div>
          {!lesson.isCompleted ? (
            <button
              onClick={() => markComplete.mutate({ id: lessonId, workspaceId })}
              disabled={markComplete.isPending}
              className="px-4 py-2 text-sm font-medium rounded-md bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors"
            >
              {markComplete.isPending ? 'Saving…' : 'Mark Complete'}
            </button>
          ) : (
            <span className="text-sm text-green-600 dark:text-green-400 font-medium">
              ✓ Completed
            </span>
          )}
        </div>
        <div className="flex gap-3">
          {prevLesson && (
            <Link
              href={`/workspace/${workspaceId}/lesson/${prevLesson.id as string}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Previous
            </Link>
          )}
          {nextLesson && (
            <Link
              href={`/workspace/${workspaceId}/lesson/${nextLesson.id as string}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Next →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { Button } from '@learn-x/ui'
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'

interface MobileLessonFooterProps {
  prevLesson: { id: string; title: string } | null
  nextLesson: { id: string; title: string } | null
  isCompleted: boolean
  markComplete: {
    mutate: (input: { id: string; workspaceId: string }) => void
    isPending: boolean
  }
  lessonId: string
  workspaceId: string
}

export function MobileLessonFooter({
  prevLesson,
  nextLesson,
  isCompleted,
  markComplete,
  lessonId,
  workspaceId,
}: MobileLessonFooterProps) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-30 md:hidden bg-background/95 backdrop-blur-xl border-t border-border px-4 py-3 pb-[env(safe-area-inset-bottom,12px)]">
      <div className="flex items-center justify-between gap-2">
        {prevLesson ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/workspace/${workspaceId}/lesson/${prevLesson.id}`}>
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </Button>
        ) : (
          <Button variant="ghost" size="sm" disabled>
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}

        {isCompleted ? (
          <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-500">
            <CheckCircle2 className="w-4 h-4" /> Done
          </span>
        ) : (
          <Button
            size="sm"
            className="rounded-xl"
            onClick={() => markComplete.mutate({ id: lessonId, workspaceId })}
            disabled={markComplete.isPending}
          >
            {markComplete.isPending ? 'Saving...' : 'Mark Complete'}
          </Button>
        )}

        {nextLesson ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/workspace/${workspaceId}/lesson/${nextLesson.id}`}>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </Button>
        ) : (
          <Button variant="ghost" size="sm" disabled>
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

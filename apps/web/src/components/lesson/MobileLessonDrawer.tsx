'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, CheckCircle } from 'lucide-react'

interface LessonInfo {
  id: string
  title: string
  isCompleted: boolean
}

interface MobileLessonDrawerProps {
  lessons: LessonInfo[]
  currentLessonId: string
  workspaceId: string
}

export function MobileLessonDrawer({
  lessons,
  currentLessonId,
  workspaceId,
}: MobileLessonDrawerProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden p-2 rounded-lg hover:bg-muted"
        aria-label="Lesson list"
      >
        <Menu className="w-5 h-5" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setOpen(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false)
            }}
            role="button"
            tabIndex={0}
            aria-label="Close lesson list"
          />
          <div className="fixed inset-y-0 left-0 z-50 w-[85vw] max-w-sm bg-background border-r border-border p-4 overflow-y-auto md:hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-foreground">Lessons</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-1">
              {lessons.map((lesson, i) => (
                <Link
                  key={lesson.id}
                  href={`/workspace/${workspaceId}/lesson/${lesson.id}`}
                  onClick={() => setOpen(false)}
                  className={`block w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    lesson.id === currentLessonId
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground/60 w-5">{i + 1}</span>
                    <span className="line-clamp-1">{lesson.title}</span>
                    {lesson.isCompleted && (
                      <CheckCircle className="ml-auto w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    )}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}

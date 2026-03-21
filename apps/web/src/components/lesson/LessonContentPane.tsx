'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { LessonRenderer } from './LessonRenderer'
import { PodcastPlayer } from '@/components/podcast/PodcastPlayer'
import { LessonRatingDialog } from './LessonRatingDialog'
import { SourcesPanel } from './sections/SourcesPanel'
import type { SourceInfo } from './sections/CitationBadge'
import type { LessonSection } from '@learn-x/validators'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Maximize2,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@learn-x/ui'

export interface LessonInfo {
  id: string
  title: string
  order_index: number
  summary: string | null
  is_completed: boolean
  syllabus_topic_id?: string | null
}

interface LessonContentPaneProps {
  workspaceId: string
  lessonId: string
  allLessons: LessonInfo[]
  onNavigate: (id: string) => void
}

export function LessonContentPane({
  workspaceId,
  lessonId,
  allLessons,
  onNavigate,
}: LessonContentPaneProps) {
  const [focusMode, setFocusMode] = useState(false)
  const [justCompleted, setJustCompleted] = useState(false)
  const [showRating, setShowRating] = useState(false)
  const [highlightedCitation, setHighlightedCitation] = useState<number | null>(null)

  const { data: lesson, isLoading } = trpc.lesson.get.useQuery({ id: lessonId, workspaceId })
  const utils = trpc.useUtils()

  const markComplete = trpc.lesson.markComplete.useMutation({
    onSuccess: () => {
      void utils.lesson.get.invalidate({ id: lessonId, workspaceId })
      void utils.lesson.list.invalidate({ workspaceId })
      setJustCompleted(true)
      setTimeout(() => setJustCompleted(false), 4000)
      setTimeout(() => setShowRating(true), 1500)
    },
  })

  const regenerate = trpc.lesson.regenerate.useMutation({
    onSuccess: () => {
      void utils.lesson.get.invalidate({ id: lessonId, workspaceId })
      void utils.lesson.list.invalidate({ workspaceId })
    },
  })

  const currentIdx = allLessons.findIndex((l) => l.id === lessonId)
  const prevLesson = currentIdx > 0 ? allLessons[currentIdx - 1] : null
  const nextLesson = currentIdx < allLessons.length - 1 ? allLessons[currentIdx + 1] : null

  if (isLoading || !lesson) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-2xl px-8">
          <div className="h-8 bg-muted/50 rounded-xl w-2/3" />
          <div className="h-4 bg-muted/30 rounded w-1/2" />
          <div className="h-64 bg-card/50 rounded-2xl" />
        </div>
      </div>
    )
  }

  const sections = (lesson.structuredSections as LessonSection[]) ?? []
  const wordCount = sections.reduce((sum, s) => {
    if (s.type === 'text') return sum + s.content.split(/\s+/).length
    return sum
  }, 0)
  const readMinutes = Math.max(1, Math.ceil(wordCount / 200))

  return (
    <div className="flex-1 min-h-0 flex flex-col relative">
      <motion.div
        className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm m-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        key={lessonId}
      >
        {/* Completion celebration overlay */}
        <AnimatePresence>
          {justCompleted && (
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-emerald-500/90 backdrop-blur-md text-white px-6 py-3 flex items-center justify-center gap-2 shadow-lg z-50 absolute top-0 left-0 right-0"
            >
              <CheckCircle className="w-5 h-5" />
              <span className="font-bold">Lesson marked as complete!</span>
            </motion.div>
          )}
        </AnimatePresence>

        <ContentHeader
          title={lesson.title}
          readMinutes={readMinutes}
          isCompleted={!!lesson.isCompleted}
          focusMode={focusMode}
          onToggleFocus={() => setFocusMode(!focusMode)}
          nextLesson={nextLesson}
          onNavigate={onNavigate}
        />

        <ContentBody
          workspaceId={workspaceId}
          lessonId={lessonId}
          lesson={lesson}
          sections={sections}
          highlightedCitation={highlightedCitation}
          onCitationClick={(n) => {
            setHighlightedCitation(n)
            document.getElementById('sources-panel')?.scrollIntoView({ behavior: 'smooth' })
          }}
          regenerate={regenerate}
        />

        <ContentActionBar
          prevLesson={prevLesson}
          nextLesson={nextLesson}
          isCompleted={!!lesson.isCompleted}
          markComplete={markComplete}
          lessonId={lessonId}
          workspaceId={workspaceId}
          onNavigate={onNavigate}
        />
      </motion.div>
    </div>
  )
}

/* ── Sub-components ─────────────────────────────────────────────────── */

function ContentHeader({
  title,
  readMinutes,
  isCompleted,
  focusMode,
  onToggleFocus,
  nextLesson,
  onNavigate,
}: {
  title: string
  readMinutes: number
  isCompleted: boolean
  focusMode: boolean
  onToggleFocus: () => void
  nextLesson: LessonInfo | null | undefined
  onNavigate: (id: string) => void
}) {
  return (
    <div className="px-5 py-3 border-b border-border/50 flex-shrink-0 bg-card/50 backdrop-blur-sm relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
      <div className="flex items-center justify-between relative z-10">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-foreground tracking-tight truncate">{title}</h2>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-full border border-border/50">
              <Clock className="w-3 h-3" />
              {readMinutes} min read
            </span>
            {isCompleted && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-semibold border border-emerald-500/20">
                <CheckCircle className="w-3 h-3" />
                Done
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleFocus}
            className="h-7 px-2 text-xs"
            title="Focus Mode"
          >
            <Maximize2 className="w-3.5 h-3.5 mr-1" />
            Focus
          </Button>
          {nextLesson && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate(nextLesson.id)}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function ContentBody({
  workspaceId,
  lessonId,
  lesson,
  sections,
  highlightedCitation,
  onCitationClick,
  regenerate,
}: {
  workspaceId: string
  lessonId: string
  lesson: any
  sections: LessonSection[]
  highlightedCitation: number | null
  onCitationClick: (n: number) => void
  regenerate: { mutate: (input: { id: string; workspaceId: string }) => void; isPending: boolean }
}) {
  return (
    <div className="flex-1 min-h-0 overflow-hidden bg-background/50">
      <div className="h-full overflow-y-auto custom-scrollbar">
        <div className="mx-auto p-6 pb-12 max-w-5xl">
          {lesson.sourceUpdated && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="text-sm text-muted-foreground flex-1">
                Source material updated — this lesson may be outdated.
              </p>
              <button
                type="button"
                onClick={() => regenerate.mutate({ id: lessonId, workspaceId })}
                disabled={regenerate.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${regenerate.isPending ? 'animate-spin' : ''}`}
                />
                {regenerate.isPending ? 'Regenerating…' : 'Regenerate'}
              </button>
            </div>
          )}

          <div className="mb-8">
            <PodcastPlayer workspaceId={workspaceId} lessonId={lessonId} />
          </div>

          <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-p:leading-relaxed prose-p:text-muted-foreground prose-a:text-primary">
            <LessonRenderer
              sections={sections}
              collapsible
              sourceMapping={(lesson.sourceMapping as SourceInfo[]) ?? []}
              onCitationClick={onCitationClick}
            />
          </div>

          <SourcesPanel
            sources={(lesson.sourceMapping as SourceInfo[]) ?? []}
            highlightedId={highlightedCitation}
          />
        </div>
      </div>
    </div>
  )
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function ContentActionBar({
  prevLesson,
  nextLesson,
  isCompleted,
  markComplete,
  lessonId,
  workspaceId,
  onNavigate,
}: {
  prevLesson: LessonInfo | null | undefined
  nextLesson: LessonInfo | null | undefined
  isCompleted: boolean
  markComplete: { mutate: (input: { id: string; workspaceId: string }) => void; isPending: boolean }
  lessonId: string
  workspaceId: string
  onNavigate: (id: string) => void
}) {
  return (
    <div className="border-t border-border/50 bg-card/80 backdrop-blur-md flex-shrink-0 p-4">
      <div className="flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          {prevLesson && (
            <Button variant="ghost" size="sm" onClick={() => onNavigate(prevLesson.id)}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
          )}
        </div>

        {!isCompleted ? (
          <Button
            onClick={() => markComplete.mutate({ id: lessonId, workspaceId })}
            disabled={markComplete.isPending}
            className="ml-auto shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
          >
            {markComplete.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Marking complete...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark as complete
              </>
            )}
          </Button>
        ) : nextLesson ? (
          <Button
            onClick={() => onNavigate(nextLesson.id)}
            className="ml-auto shadow-lg shadow-primary/20"
          >
            Next Lesson
            <ChevronRight className="ml-2 w-4 h-4" />
          </Button>
        ) : (
          <Button variant="outline" disabled className="ml-auto">
            All Lessons Complete
          </Button>
        )}
      </div>
    </div>
  )
}

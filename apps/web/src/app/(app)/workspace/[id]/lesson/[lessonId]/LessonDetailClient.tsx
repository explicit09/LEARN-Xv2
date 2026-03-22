'use client'

import Link from 'next/link'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { trpc } from '@/lib/trpc/client'
import { LessonRenderer } from '@/components/lesson/LessonRenderer'
import { LessonSidebar } from '@/components/lesson/LessonSidebar'
import { LessonChatPanel } from '@/components/lesson/chat/LessonChatPanel'
import { LessonRatingDialog } from '@/components/lesson/LessonRatingDialog'
import { PodcastPlayer } from '@/components/podcast/PodcastPlayer'
import { SourcesPanel } from '@/components/lesson/sections/SourcesPanel'
import type { SourceInfo } from '@/components/lesson/sections/CitationBadge'
import type { LessonSection } from '@learn-x/validators'
import {
  BookOpen,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  AlertTriangle,
  RefreshCw,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { Button } from '@learn-x/ui'
import { MobileLessonFooter } from '@/components/lesson/MobileLessonFooter'
import { MobileLessonDrawer } from '@/components/lesson/MobileLessonDrawer'

interface LessonDetailClientProps {
  workspaceId: string
  lessonId: string
}

function getScrollKey(lessonId: string) {
  return `learn-x:scroll:${lessonId}`
}

function estimateReadTime(sections: LessonSection[]): number {
  let words = 0
  for (const s of sections) {
    if (s.type === 'text') words += s.content.split(/\s+/).length
    if (s.type === 'concept_definition') words += (s.term + ' ' + s.definition).split(/\s+/).length
    if (s.type === 'key_takeaway') words += s.points.join(' ').split(/\s+/).length
  }
  return Math.max(1, Math.ceil(words / 200))
}

export function LessonDetailClient({ workspaceId, lessonId }: LessonDetailClientProps) {
  const [focusMode, setFocusMode] = useState(false)
  const [selectedText, setSelectedText] = useState<string | null>(null)
  const [justCompleted, setJustCompleted] = useState(false)
  const [showRating, setShowRating] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const scrollRestoredRef = useRef(false)

  const { data: lesson, isLoading, error } = trpc.lesson.get.useQuery({ id: lessonId, workspaceId })
  const { data: allLessons } = trpc.lesson.list.useQuery({ workspaceId })
  const { data: syllabusData } = trpc.syllabus.get.useQuery({ workspaceId })
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

  // ── Scroll persistence ──────────────────────────────────────
  const saveScroll = useCallback(() => {
    if (!contentRef.current) return
    try {
      localStorage.setItem(getScrollKey(lessonId), String(contentRef.current.scrollTop))
    } catch {
      /* ignore */
    }
  }, [lessonId])

  useEffect(() => {
    scrollRestoredRef.current = false
  }, [lessonId])

  useEffect(() => {
    if (!lesson || !contentRef.current || scrollRestoredRef.current) return
    try {
      const saved = localStorage.getItem(getScrollKey(lessonId))
      if (saved) contentRef.current.scrollTop = Number(saved)
    } catch {
      /* ignore */
    }
    scrollRestoredRef.current = true
  }, [lesson, lessonId])

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    el.addEventListener('scroll', saveScroll, { passive: true })
    window.addEventListener('beforeunload', saveScroll)
    return () => {
      saveScroll()
      el.removeEventListener('scroll', saveScroll)
      window.removeEventListener('beforeunload', saveScroll)
    }
  }, [saveScroll])

  // ── Text selection → chat context ──────────────────────────
  useEffect(() => {
    function handleMouseUp() {
      const text = window.getSelection()?.toString().trim()
      if (text && text.length > 3 && text.length < 500) setSelectedText(text)
    }
    const el = contentRef.current
    if (!el) return
    el.addEventListener('mouseup', handleMouseUp)
    return () => el.removeEventListener('mouseup', handleMouseUp)
  }, [lesson])

  if (isLoading) {
    return (
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto p-4 md:p-8 animate-pulse">
        <div className="w-64 h-96 bg-muted/50 rounded-2xl hidden md:block mr-8" />
        <div className="flex-1 space-y-4">
          <div className="h-10 bg-muted/50 rounded-xl w-1/3" />
          <div className="h-64 bg-card/50 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (error || !lesson) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center glass-card p-12 rounded-3xl max-w-md w-full">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Lesson not found</h2>
          <p className="text-sm text-muted-foreground mb-6">
            This lesson may have been deleted or is unavailable.
          </p>
          <Button asChild className="w-full h-11 rounded-xl font-semibold">
            <Link href={`/workspace/${workspaceId}?tab=lessons`}>Back to Lessons</Link>
          </Button>
        </div>
      </div>
    )
  }

  const sortedLessons = (allLessons ?? []).sort(
    (a, b) => (a.order_index as number) - (b.order_index as number),
  )
  const currentIndex = sortedLessons.findIndex((l) => l.id === lessonId)
  const prevLesson = currentIndex > 0 ? sortedLessons[currentIndex - 1] : null
  const nextLesson =
    currentIndex < sortedLessons.length - 1 ? sortedLessons[currentIndex + 1] : null
  const progressPercent = Math.round(((currentIndex + 1) / Math.max(1, sortedLessons.length)) * 100)

  const sections = (lesson.structuredSections as LessonSection[]) ?? []
  const readMinutes = estimateReadTime(sections)
  const sectionCount = sections.length
  const sectionTypes = sections.filter((s) => s.type !== 'text').map((s) => s.type)

  return (
    <>
      <div className="flex-1 flex flex-col md:flex-row max-w-[1600px] w-full mx-auto px-0 py-2 md:p-4 lg:p-8 gap-4 md:gap-8 overflow-x-hidden">
        {!focusMode && (
          <LessonSidebar
            workspaceId={workspaceId}
            lessonId={lessonId}
            sortedLessons={sortedLessons as never}
            currentIndex={currentIndex}
            progressPercent={progressPercent}
            syllabusData={syllabusData as never}
          />
        )}

        <div
          ref={contentRef}
          className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-24 lg:pb-12 scroll-smooth custom-scrollbar md:pr-2 lg:pr-8"
        >
          {/* Completion celebration banner */}
          <AnimatePresence>
            {justCompleted && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-6 flex items-center gap-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-5 py-3 max-w-4xl"
              >
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-bold text-emerald-500">Lesson complete!</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <MobileLessonDrawer
                lessons={sortedLessons.map((l) => ({
                  id: l.id as string,
                  title: l.title as string,
                  isCompleted: !!(l as Record<string, unknown>).is_completed,
                }))}
                currentLessonId={lessonId}
                workspaceId={workspaceId}
              />
              <BookOpen className="w-4 h-4" />
              <span>Workspace</span>
              <span>/</span>
              <span className="text-foreground">{lesson.title}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
                <span className="font-bold mr-1">{sectionCount} sections</span>
                {sectionTypes.slice(0, 8).map((type, i) => {
                  const colors: Record<string, string> = {
                    concept_definition: 'bg-blue-500',
                    analogy_card: 'bg-emerald-500',
                    process_flow: 'bg-indigo-500',
                    mini_quiz: 'bg-amber-500',
                    comparison_table: 'bg-violet-500',
                    timeline: 'bg-amber-400',
                    key_takeaway: 'bg-primary',
                    concept_bridge: 'bg-sky-400',
                    quote_block: 'bg-gray-400',
                    code_explainer: 'bg-orange-500',
                  }
                  return (
                    <span
                      key={i}
                      className={`w-2 h-2 rounded-full ${colors[type] ?? 'bg-muted-foreground'}`}
                    />
                  )
                })}
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
                <PlayCircle className="w-3.5 h-3.5" />~{readMinutes} min read
              </div>
              {lesson.isCompleted && (
                <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Completed
                </div>
              )}
              <button
                type="button"
                onClick={() => setFocusMode(!focusMode)}
                className="hidden md:flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted px-3 py-1.5 rounded-lg transition-colors"
                title={focusMode ? 'Exit focus mode' : 'Focus mode'}
              >
                {focusMode ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Stale lesson notice */}
          {lesson.sourceUpdated && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 max-w-4xl">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="text-sm text-amber-200 flex-1">
                New material was added that covers this topic. This lesson may be outdated.
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
                {regenerate.isPending ? 'Regenerating…' : 'Regenerate lesson'}
              </button>
            </div>
          )}

          {/* Title */}
          <div className="mb-6 md:mb-10 lg:mb-16 max-w-full md:max-w-4xl">
            <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] mb-4 md:mb-6 break-words">
              {lesson.title}
            </h1>
            {lesson.summary && (
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl">
                {lesson.summary}
              </p>
            )}
          </div>

          {/* Podcast player */}
          <div className="mb-8 max-w-4xl">
            <PodcastPlayer workspaceId={workspaceId} lessonId={lessonId} />
          </div>

          {/* Content */}
          <div className="prose prose-base sm:prose-lg dark:prose-invert max-w-full md:max-w-5xl w-full break-words prose-headings:font-bold prose-h2:text-2xl sm:prose-h2:text-3xl prose-h2:mt-8 sm:prose-h2:mt-12 prose-h2:mb-4 sm:prose-h2:mb-6 prose-p:leading-relaxed prose-p:text-muted-foreground prose-a:text-primary">
            <LessonRenderer
              sections={sections}
              collapsible
              sourceMapping={(lesson.sourceMapping as SourceInfo[]) ?? []}
              onCitationClick={() => {
                document.getElementById('sources-panel')?.scrollIntoView({ behavior: 'smooth' })
              }}
            />
          </div>

          {/* Sources panel */}
          <SourcesPanel sources={(lesson.sourceMapping as SourceInfo[]) ?? []} />

          {/* Footer navigation — desktop only */}
          <div className="mt-16 pt-8 border-t border-border hidden md:flex flex-col sm:flex-row items-center justify-between gap-6 max-w-5xl w-full">
            <div>
              {!lesson.isCompleted && (
                <Button
                  size="lg"
                  onClick={() => markComplete.mutate({ id: lessonId, workspaceId })}
                  disabled={markComplete.isPending}
                  className="rounded-xl px-8 font-bold shadow-[0_0_20px_rgba(37,99,235,0.4)] h-12"
                >
                  {markComplete.isPending ? 'Saving...' : 'Mark as Complete'}
                  <CheckCircle className="ml-2 w-5 h-5" />
                </Button>
              )}
            </div>
            <div className="flex items-center gap-4">
              {prevLesson && (
                <Button
                  asChild
                  variant="outline"
                  className="glass h-12 rounded-xl px-6 font-semibold"
                >
                  <Link href={`/workspace/${workspaceId}/lesson/${prevLesson.id as string}`}>
                    <ChevronLeft className="mr-2 w-4 h-4" />
                    Previous
                  </Link>
                </Button>
              )}
              {nextLesson && (
                <Button asChild className="h-12 rounded-xl px-6 font-semibold shadow-lg">
                  <Link href={`/workspace/${workspaceId}/lesson/${nextLesson.id as string}`}>
                    Next Lesson
                    <ChevronRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <LessonChatPanel
        lessonId={lessonId}
        workspaceId={workspaceId}
        lessonTitle={lesson.title}
        selectedText={selectedText}
        onClearSelection={() => setSelectedText(null)}
      />

      <LessonRatingDialog
        lessonId={lessonId}
        lessonTitle={lesson.title}
        workspaceId={workspaceId}
        open={showRating}
        onClose={() => setShowRating(false)}
      />

      <MobileLessonFooter
        prevLesson={
          prevLesson ? { id: prevLesson.id as string, title: prevLesson.title as string } : null
        }
        nextLesson={
          nextLesson ? { id: nextLesson.id as string, title: nextLesson.title as string } : null
        }
        isCompleted={!!lesson.isCompleted}
        markComplete={markComplete}
        lessonId={lessonId}
        workspaceId={workspaceId}
      />
    </>
  )
}

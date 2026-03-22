'use client'

import { useState, useMemo } from 'react'
import { trpc } from '@/lib/trpc/client'
import { LessonChatPanel } from './chat/LessonChatPanel'
import { LessonContentPane } from './LessonContentPane'
import type { LessonInfo } from './LessonContentPane'
import { CollapsedSidebar, ExpandedSidebar } from './LessonSidebarPanels'
import type { ModuleGroup } from './LessonSidebarPanels'
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Sparkles,
} from 'lucide-react'
import { Button } from '@learn-x/ui'

interface LessonsTabProps {
  workspaceId: string
}

export function LessonsTab({ workspaceId }: LessonsTabProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set())

  const { data: docs } = trpc.document.list.useQuery({ workspaceId })
  const hasProcessing = docs?.some((d) => ['uploading', 'processing'].includes(d.status as string))
  const {
    data: lessons,
    isLoading,
    refetch,
  } = trpc.lesson.list.useQuery({ workspaceId }, { refetchInterval: hasProcessing ? 5000 : false })
  const { data: syllabusData } = trpc.syllabus.get.useQuery({ workspaceId })

  const triggerGenerate = trpc.lesson.triggerGenerate.useMutation({
    onSuccess: () => setTimeout(() => refetch(), 2000),
  })

  const allLessons = useMemo(
    () => ((lessons ?? []) as LessonInfo[]).sort((a, b) => a.order_index - b.order_index),
    [lessons],
  )

  const groups = useMemo(
    () => buildModuleGroups(allLessons, syllabusData as SyllabusShape | null),
    [allLessons, syllabusData],
  )

  const completed = allLessons.filter((l) => l.is_completed).length
  const progressPercent =
    allLessons.length > 0 ? Math.round((completed / allLessons.length) * 100) : 0

  const toggleModule = (name: string) => {
    setCollapsedModules((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  // Auto-select first lesson if none selected
  if (!selectedId && allLessons.length > 0) {
    const first = allLessons.find((l) => !l.is_completed) ?? allLessons[0]
    if (first) setSelectedId(first.id)
  }

  if (isLoading) {
    return (
      <div className="flex h-full animate-pulse">
        <div className="hidden md:block w-72 border-r border-border bg-card/30 p-4 space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-muted/50" />
          ))}
        </div>
        <div className="flex-1 p-4 md:p-8 space-y-4">
          <div className="h-8 bg-muted/50 rounded-xl w-1/3" />
          <div className="h-64 bg-card/50 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (allLessons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-16 text-center rounded-2xl sm:rounded-3xl border border-dashed border-border/50 bg-card/20 backdrop-blur-sm m-3 sm:m-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 shadow-inner border border-primary/20">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Ready to Learn?</h2>
        <p className="text-muted-foreground max-w-sm mb-8">
          Generate personalized lessons from your course materials.
        </p>
        <Button
          size="lg"
          onClick={() => triggerGenerate.mutate({ workspaceId })}
          disabled={triggerGenerate.isPending}
          className="rounded-xl px-8 font-bold shadow-[0_0_20px_rgba(37,99,235,0.4)]"
        >
          {triggerGenerate.isPending ? 'Generating...' : 'Generate Lessons'}
          <Sparkles className="ml-2 w-4 h-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Mobile lesson selector */}
      <MobileLessonSelector
        lessons={allLessons}
        selectedId={selectedId}
        onSelect={setSelectedId}
        completed={completed}
        total={allLessons.length}
      />

      <div className="flex flex-1 min-h-0 overflow-x-hidden">
        {/* Sidebar */}
        <div
          className={`flex-shrink-0 min-h-0 border-r border-border bg-card/30 hidden md:flex flex-col transition-all duration-300 relative ${
            sidebarCollapsed ? 'w-12' : 'w-72 lg:w-80'
          }`}
        >
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full border bg-background shadow-sm flex items-center justify-center hover:bg-muted text-muted-foreground"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" />
            )}
          </button>

          {sidebarCollapsed ? (
            <CollapsedSidebar
              completed={completed}
              total={allLessons.length}
              progressPercent={progressPercent}
            />
          ) : (
            <ExpandedSidebar
              groups={groups}
              selectedId={selectedId}
              collapsedModules={collapsedModules}
              onToggleModule={toggleModule}
              onSelectLesson={setSelectedId}
              completed={completed}
              total={allLessons.length}
              progressPercent={progressPercent}
              hasMultipleGroups={groups.length > 1}
            />
          )}
        </div>

        {/* Content Area */}
        {selectedId ? (
          <LessonContentPane
            workspaceId={workspaceId}
            lessonId={selectedId}
            allLessons={allLessons}
            onNavigate={setSelectedId}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Select a lesson to start reading</p>
            </div>
          </div>
        )}
      </div>

      {selectedId && (
        <LessonChatPanel
          lessonId={selectedId}
          workspaceId={workspaceId}
          lessonTitle={allLessons.find((l) => l.id === selectedId)?.title}
        />
      )}
    </div>
  )
}

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

interface SyllabusShape {
  units: {
    id: string
    title: string
    topics: {
      id: string
      title: string
      learningObjectives?: string[]
      estimatedDurationMinutes?: number
    }[]
  }[]
}

function buildModuleGroups(lessons: LessonInfo[], syllabus: SyllabusShape | null): ModuleGroup[] {
  if (!syllabus?.units?.length) {
    return [
      {
        title: 'Learning Path',
        lessons,
        completed: lessons.filter((l) => l.is_completed).length,
        topicMeta: new Map(),
      },
    ]
  }

  const topicToUnit = new Map<string, string>()
  const topicMeta = new Map<string, { duration: number; objectives: number }>()
  for (const unit of syllabus.units) {
    for (const topic of unit.topics) {
      topicToUnit.set(topic.id, unit.title)
      topicMeta.set(topic.id, {
        duration: topic.estimatedDurationMinutes ?? 30,
        objectives: topic.learningObjectives?.length ?? 0,
      })
    }
  }

  const unitMap = new Map<string, ModuleGroup>()
  const ungrouped: LessonInfo[] = []

  for (const lesson of lessons) {
    const unitTitle = lesson.syllabus_topic_id
      ? topicToUnit.get(lesson.syllabus_topic_id)
      : undefined
    if (unitTitle) {
      if (!unitMap.has(unitTitle)) {
        unitMap.set(unitTitle, {
          title: unitTitle,
          lessons: [],
          completed: 0,
          topicMeta,
        })
      }
      const g = unitMap.get(unitTitle)!
      g.lessons.push(lesson)
      if (lesson.is_completed) g.completed++
    } else {
      ungrouped.push(lesson)
    }
  }

  const groups: ModuleGroup[] = []
  for (const unit of syllabus.units) {
    const g = unitMap.get(unit.title)
    if (g) groups.push(g)
  }
  if (ungrouped.length > 0) {
    groups.push({
      title: 'Other',
      lessons: ungrouped,
      completed: ungrouped.filter((l) => l.is_completed).length,
      topicMeta,
    })
  }

  return groups.length > 0
    ? groups
    : [
        {
          title: 'Learning Path',
          lessons,
          completed: lessons.filter((l) => l.is_completed).length,
          topicMeta,
        },
      ]
}

/** Mobile-only dropdown to switch between lessons */
function MobileLessonSelector({
  lessons,
  selectedId,
  onSelect,
  completed,
  total,
}: {
  lessons: LessonInfo[]
  selectedId: string | null
  onSelect: (id: string) => void
  completed: number
  total: number
}) {
  const [open, setOpen] = useState(false)
  const current = lessons.find((l) => l.id === selectedId)

  if (lessons.length === 0) return null

  return (
    <div className="md:hidden flex flex-col min-w-0 w-full">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border bg-card/50 text-sm"
      >
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="w-4 h-4 shrink-0 text-primary" />
          <span className="truncate font-medium">{current?.title ?? 'Select lesson'}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">
            {completed}/{total}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {open && (
        <div className="border-b border-border bg-card/80 max-h-[50vh] overflow-y-auto">
          {lessons.map((lesson, i) => (
            <button
              key={lesson.id}
              type="button"
              onClick={() => {
                onSelect(lesson.id)
                setOpen(false)
              }}
              className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                lesson.id === selectedId
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <span className="w-5 text-xs text-muted-foreground/50 shrink-0">{i + 1}</span>
              <span className="truncate flex-1">{lesson.title}</span>
              {lesson.is_completed && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

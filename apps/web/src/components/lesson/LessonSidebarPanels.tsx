'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, CheckCircle, ChevronRight, Clock, Layers } from 'lucide-react'
import type { LessonInfo } from './LessonContentPane'

export interface ModuleGroup {
  title: string
  lessons: LessonInfo[]
  completed: number
  topicMeta: Map<string, { duration: number; objectives: number }>
}

export function CollapsedSidebar({
  completed,
  total,
  progressPercent,
}: {
  completed: number
  total: number
  progressPercent: number
}) {
  return (
    <div className="flex flex-col items-center pt-14 gap-4">
      <BookOpen className="w-4 h-4 text-muted-foreground" />
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs font-medium text-primary">{completed}</span>
        <div className="w-1 h-8 bg-muted rounded-full overflow-hidden">
          <div
            className="w-full bg-primary rounded-full transition-all"
            style={{ height: `${progressPercent}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground">{total}</span>
      </div>
    </div>
  )
}

export function ExpandedSidebar({
  groups,
  selectedId,
  collapsedModules,
  onToggleModule,
  onSelectLesson,
  completed,
  total,
  progressPercent,
  hasMultipleGroups,
}: {
  groups: ModuleGroup[]
  selectedId: string | null
  collapsedModules: Set<string>
  onToggleModule: (name: string) => void
  onSelectLesson: (id: string) => void
  completed: number
  total: number
  progressPercent: number
  hasMultipleGroups: boolean
}) {
  return (
    <div className="flex flex-col h-full min-h-0 pt-10">
      {/* Progress header */}
      <div className="px-4 py-3 border-b border-border/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold">Learning Path</span>
          <span className="text-xs text-muted-foreground">
            {completed}/{total}
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Lesson list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
        {groups.map((group) => (
          <ModuleGroupSection
            key={group.title}
            group={group}
            isCollapsed={collapsedModules.has(group.title)}
            selectedId={selectedId}
            hasMultipleGroups={hasMultipleGroups}
            onToggleModule={onToggleModule}
            onSelectLesson={onSelectLesson}
          />
        ))}
      </div>
    </div>
  )
}

/* ── Module group section ──────────────────────────────────────────── */

function ModuleGroupSection({
  group,
  isCollapsed,
  selectedId,
  hasMultipleGroups,
  onToggleModule,
  onSelectLesson,
}: {
  group: ModuleGroup
  isCollapsed: boolean
  selectedId: string | null
  hasMultipleGroups: boolean
  onToggleModule: (name: string) => void
  onSelectLesson: (id: string) => void
}) {
  const unitProgress =
    group.lessons.length > 0 ? Math.round((group.completed / group.lessons.length) * 100) : 0

  return (
    <div className="space-y-1">
      {hasMultipleGroups && (
        <button
          type="button"
          onClick={() => onToggleModule(group.title)}
          className="w-full flex items-center gap-2 p-2.5 rounded-lg hover:bg-muted/50 group/mod"
        >
          <div className="w-6 h-6 rounded flex items-center justify-center bg-primary/10 text-primary shrink-0">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-2">
              <span className="font-medium text-xs truncate">{group.title}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {group.completed}/{group.lessons.length}
              </span>
            </div>
            <div className="h-1 bg-muted rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-primary/60 rounded-full transition-all"
                style={{ width: `${unitProgress}%` }}
              />
            </div>
          </div>
          <motion.div animate={{ rotate: isCollapsed ? 0 : 90 }} transition={{ duration: 0.2 }}>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </motion.div>
        </button>
      )}

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={hasMultipleGroups ? { opacity: 0, height: 0 } : false}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={hasMultipleGroups ? 'pl-4 space-y-1' : 'space-y-1'}
          >
            {group.lessons.map((lesson, idx) => (
              <LessonSidebarItem
                key={lesson.id}
                lesson={lesson}
                index={idx}
                isActive={lesson.id === selectedId}
                meta={
                  lesson.syllabus_topic_id
                    ? group.topicMeta.get(lesson.syllabus_topic_id)
                    : undefined
                }
                onSelect={onSelectLesson}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Individual lesson item ────────────────────────────────────────── */

function LessonSidebarItem({
  lesson,
  index,
  isActive,
  meta,
  onSelect,
}: {
  lesson: LessonInfo
  index: number
  isActive: boolean
  meta?: { duration: number; objectives: number } | undefined
  onSelect: (id: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(lesson.id)}
      className={`w-full text-left p-2 rounded-lg flex items-start gap-2.5 transition-all ${
        isActive
          ? 'bg-primary/10 border border-primary/30'
          : lesson.is_completed
            ? 'hover:bg-emerald-500/5 border border-transparent'
            : 'hover:bg-muted/50 border border-transparent'
      }`}
    >
      {/* Number / check */}
      <div
        className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center border text-xs font-bold ${
          lesson.is_completed
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
            : isActive
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'bg-muted border-border text-muted-foreground'
        }`}
      >
        {lesson.is_completed ? <CheckCircle className="w-3.5 h-3.5" /> : index + 1}
      </div>

      <div className="flex-1 min-w-0">
        <span
          className={`text-xs font-medium line-clamp-2 ${
            isActive
              ? 'text-primary'
              : lesson.is_completed
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-foreground'
          }`}
        >
          {lesson.title}
        </span>
        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
          {meta?.duration && (
            <span className="flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {meta.duration}m
            </span>
          )}
          {meta?.objectives != null && meta.objectives > 0 && (
            <span className="flex items-center gap-0.5">
              <BookOpen className="w-2.5 h-2.5" />
              {meta.objectives} obj
            </span>
          )}
        </div>

        {isActive && (
          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{lesson.summary}</p>
        )}
      </div>

      {isActive && <ChevronRight className="w-3.5 h-3.5 text-primary shrink-0 mt-1" />}
    </button>
  )
}

'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { LessonCard } from './LessonCard'
import { GraduationCap, Sparkles, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@learn-x/ui'

interface LessonListProps {
  workspaceId: string
}

interface LessonInfo {
  id: string
  title: string
  order_index: number
  summary: string | null
  is_completed: boolean
  syllabus_topic_id?: string | null
}

interface UnitGroup {
  title: string
  lessons: LessonInfo[]
  completed: number
  estimatedMinutes?: number | undefined
  objectiveCounts: Map<string, number>
}

export function LessonList({ workspaceId }: LessonListProps) {
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

  const [collapsedUnits, setCollapsedUnits] = useState<Set<string>>(new Set())

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-2xl bg-muted/50 border border-border animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (!lessons || lessons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center rounded-3xl border border-dashed border-border/50 bg-card/20 backdrop-blur-sm m-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 shadow-inner border border-primary/20">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Ready to Learn?</h2>
        <p className="text-muted-foreground max-w-sm mb-8">
          We&apos;ll use your extracted concepts to generate personalized lessons.
        </p>
        <Button
          size="lg"
          onClick={() => triggerGenerate.mutate({ workspaceId })}
          disabled={triggerGenerate.isPending}
          className="rounded-xl px-8 font-bold shadow-[0_0_20px_rgba(37,99,235,0.4)]"
        >
          {triggerGenerate.isPending ? 'Generating Lessons...' : 'Generate New Lessons'}
          <Sparkles className="ml-2 w-4 h-4" />
        </Button>
      </div>
    )
  }

  const allLessons = lessons as LessonInfo[]
  const completed = allLessons.filter((l) => l.is_completed).length
  const progressPercent = Math.round((completed / Math.max(1, allLessons.length)) * 100)

  // Build groups from syllabus
  const groups = buildUnitGroups(allLessons, syllabusData)

  const toggleUnit = (title: string) => {
    setCollapsedUnits((prev) => {
      const next = new Set(prev)
      if (next.has(title)) next.delete(title)
      else next.add(title)
      return next
    })
  }

  return (
    <div className="space-y-6 p-4">
      {/* Progress Header */}
      <div className="flex items-center justify-between glass-card p-5 border border-border/50 rounded-2xl">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
            <span className="font-black text-sm text-primary">{progressPercent}%</span>
          </div>
          <div className="flex-1 max-w-md">
            <div className="flex justify-between items-end mb-1">
              <span className="text-sm font-bold">Learning Path</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {completed} of {allLessons.length}
              </span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-1000"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => triggerGenerate.mutate({ workspaceId })}
          disabled={triggerGenerate.isPending}
          className="shrink-0 rounded-xl h-10 border-border/50 ml-4 hidden sm:flex"
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${triggerGenerate.isPending ? 'animate-spin' : ''}`}
          />
          {triggerGenerate.isPending ? 'Regenerating...' : 'Regenerate'}
        </Button>
      </div>

      {/* Grouped lesson list */}
      <div className="space-y-6">
        {groups.map((group) => {
          const isCollapsed = collapsedUnits.has(group.title)
          const unitProgress =
            group.lessons.length > 0
              ? Math.round((group.completed / group.lessons.length) * 100)
              : 0

          return (
            <div key={group.title}>
              {/* Unit header - only show if there are multiple groups */}
              {groups.length > 1 && (
                <button
                  type="button"
                  onClick={() => toggleUnit(group.title)}
                  className="w-full flex items-center gap-3 mb-3 group/unit"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <h3 className="text-sm font-bold text-foreground truncate">{group.title}</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                      {group.completed}/{group.lessons.length}
                    </span>
                  </div>
                  <div className="w-16 h-1 bg-muted rounded-full overflow-hidden shrink-0">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${unitProgress}%` }}
                    />
                  </div>
                </button>
              )}

              {/* Lessons in this group */}
              {!isCollapsed && (
                <div className="space-y-3">
                  {group.lessons.map((lesson) => (
                    <LessonCard
                      key={lesson.id}
                      id={lesson.id}
                      workspaceId={workspaceId}
                      title={lesson.title}
                      orderIndex={lesson.order_index}
                      summary={lesson.summary}
                      isCompleted={lesson.is_completed}
                      estimatedMinutes={group.estimatedMinutes}
                      objectiveCount={
                        group.objectiveCounts.get(lesson.syllabus_topic_id ?? '') ?? undefined
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function buildUnitGroups(
  lessons: LessonInfo[],
  syllabusData?: {
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
  } | null,
): UnitGroup[] {
  if (!syllabusData?.units?.length) {
    return [
      {
        title: 'Learning Path',
        lessons,
        completed: lessons.filter((l) => l.is_completed).length,
        objectiveCounts: new Map(),
      },
    ]
  }

  // Build maps
  const topicToUnit = new Map<string, string>()
  const topicObjectives = new Map<string, number>()
  const topicDuration = new Map<string, number>()
  for (const unit of syllabusData.units) {
    for (const topic of unit.topics) {
      topicToUnit.set(topic.id, unit.title)
      topicObjectives.set(topic.id, topic.learningObjectives?.length ?? 0)
      topicDuration.set(topic.id, topic.estimatedDurationMinutes ?? 30)
    }
  }

  // Group
  const unitMap = new Map<string, UnitGroup>()
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
          estimatedMinutes: topicDuration.get(lesson.syllabus_topic_id!) ?? undefined,
          objectiveCounts: new Map(),
        })
      }
      const group = unitMap.get(unitTitle)!
      group.lessons.push(lesson)
      if (lesson.is_completed) group.completed++
      if (lesson.syllabus_topic_id) {
        group.objectiveCounts.set(
          lesson.syllabus_topic_id,
          topicObjectives.get(lesson.syllabus_topic_id) ?? 0,
        )
      }
    } else {
      ungrouped.push(lesson)
    }
  }

  // Preserve unit order
  const groups: UnitGroup[] = []
  for (const unit of syllabusData.units) {
    const g = unitMap.get(unit.title)
    if (g) groups.push(g)
  }
  if (ungrouped.length > 0) {
    groups.push({
      title: 'Other',
      lessons: ungrouped,
      completed: ungrouped.filter((l) => l.is_completed).length,
      objectiveCounts: new Map(),
    })
  }

  return groups.length > 0
    ? groups
    : [
        {
          title: 'Learning Path',
          lessons,
          completed: lessons.filter((l) => l.is_completed).length,
          objectiveCounts: new Map(),
        },
      ]
}

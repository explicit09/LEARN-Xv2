import Link from 'next/link'
import { CheckCircle, ChevronLeft } from 'lucide-react'

interface LessonInfo {
  id: string
  title: string
  order_index: number
  is_completed: boolean
  syllabus_topic_id?: string | null
}

interface SyllabusUnit {
  id: string
  title: string
  topics: { id: string; title: string }[]
}

interface SyllabusData {
  units: SyllabusUnit[]
}

interface LessonSidebarProps {
  workspaceId: string
  lessonId: string
  sortedLessons: LessonInfo[]
  currentIndex: number
  progressPercent: number
  syllabusData?: SyllabusData | null
}

export function LessonSidebar({
  workspaceId,
  lessonId,
  sortedLessons,
  currentIndex,
  progressPercent,
  syllabusData,
}: LessonSidebarProps) {
  // Build syllabus grouping if available
  const groups = buildLessonGroups(sortedLessons, syllabusData)

  return (
    <div className="hidden md:flex w-72 flex-col gap-6 overflow-y-auto pr-2 pb-8 custom-scrollbar">
      <Link
        href={`/workspace/${workspaceId}?tab=lessons`}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
      >
        <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </div>
        Back to lessons
      </Link>

      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.title} className="space-y-1">
            <h3 className="font-bold text-xs tracking-wider uppercase text-muted-foreground ml-1 mb-2">
              {group.title}
              {group.lessons.length > 0 && (
                <span className="ml-2 text-[10px] font-medium text-muted-foreground/60">
                  {group.lessons.filter((l) => l.is_completed).length}/{group.lessons.length}
                </span>
              )}
            </h3>
            <div className="space-y-1 relative before:absolute before:inset-y-2 before:left-[11px] before:w-px before:bg-border">
              {group.lessons.map((l) => {
                const isActive = l.id === lessonId
                const idx = sortedLessons.findIndex((sl) => sl.id === l.id)
                const isPast = idx < currentIndex
                return (
                  <Link
                    key={l.id}
                    href={`/workspace/${workspaceId}/lesson/${l.id}`}
                    className={`flex items-start gap-4 p-2 rounded-xl transition-all relative z-10 ${
                      isActive
                        ? 'bg-primary/5 text-primary'
                        : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div
                      className={`shrink-0 w-6 h-6 rounded-full mt-0.5 flex items-center justify-center border-2 bg-background ${
                        isActive
                          ? 'border-primary'
                          : isPast || l.is_completed
                            ? 'border-emerald-500 text-emerald-500'
                            : 'border-border text-transparent'
                      }`}
                    >
                      {isPast || l.is_completed ? (
                        <CheckCircle className="w-3.5 h-3.5" />
                      ) : (
                        <span
                          className="w-2 h-2 rounded-full bg-primary"
                          style={{ display: isActive ? 'block' : 'none' }}
                        />
                      )}
                    </div>
                    <span
                      className={`text-sm font-medium leading-relaxed line-clamp-2 ${isActive ? 'font-semibold' : ''}`}
                    >
                      {l.title}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Workspace Quick Stats */}
      <div className="mt-8 glass-card rounded-2xl p-4 border border-border">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Workspace Progress
        </h4>
        <div className="flex items-end justify-between mb-2">
          <span className="text-2xl font-black">{progressPercent}%</span>
          <span className="text-xs font-medium text-muted-foreground">
            {currentIndex + 1} of {sortedLessons.length}
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
  )
}

interface LessonGroup {
  title: string
  lessons: LessonInfo[]
}

function buildLessonGroups(
  lessons: LessonInfo[],
  syllabusData?: SyllabusData | null,
): LessonGroup[] {
  if (!syllabusData?.units?.length) {
    return [{ title: 'Learning Path', lessons }]
  }

  // Build topicId → unitTitle map
  const topicToUnit = new Map<string, string>()
  for (const unit of syllabusData.units) {
    for (const topic of unit.topics) {
      topicToUnit.set(topic.id, unit.title)
    }
  }

  // Group lessons by unit
  const unitMap = new Map<string, LessonInfo[]>()
  const ungrouped: LessonInfo[] = []

  for (const lesson of lessons) {
    const unitTitle = lesson.syllabus_topic_id
      ? topicToUnit.get(lesson.syllabus_topic_id)
      : undefined
    if (unitTitle) {
      const existing = unitMap.get(unitTitle) ?? []
      existing.push(lesson)
      unitMap.set(unitTitle, existing)
    } else {
      ungrouped.push(lesson)
    }
  }

  // Preserve unit order from syllabus
  const groups: LessonGroup[] = []
  for (const unit of syllabusData.units) {
    const unitLessons = unitMap.get(unit.title)
    if (unitLessons?.length) {
      groups.push({ title: unit.title, lessons: unitLessons })
    }
  }
  if (ungrouped.length > 0) {
    groups.push({ title: 'Other', lessons: ungrouped })
  }

  return groups
}

'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import { CheckCircle, Circle, Loader2, FileText, Brain, ListTree, BookOpen } from 'lucide-react'

interface PipelineActivityFeedProps {
  workspaceId: string
}

interface PipelineStep {
  key: string
  label: string
  icon: React.ElementType
  status: 'pending' | 'active' | 'done'
  detail?: string | undefined
}

export function PipelineActivityFeed({ workspaceId }: PipelineActivityFeedProps) {
  const router = useRouter()
  const prevDoneCount = useRef(0)

  const { data: docs } = trpc.document.list.useQuery({ workspaceId }, { refetchInterval: 3000 })

  const hasProcessing = docs?.some((d) => ['uploading', 'processing'].includes(d.status as string))
  const docCount = docs?.filter((d) => d.status === 'ready').length ?? 0

  // Pipeline is potentially active if docs exist — keep polling until all steps done
  const pipelineActive = docCount > 0

  const { data: conceptData } = trpc.concept.list.useQuery(
    { workspaceId },
    { refetchInterval: pipelineActive ? 4000 : false },
  )

  const { data: syllabusData } = trpc.syllabus.get.useQuery(
    { workspaceId },
    { refetchInterval: pipelineActive ? 5000 : false },
  )

  const { data: lessons } = trpc.lesson.list.useQuery(
    { workspaceId },
    { refetchInterval: pipelineActive ? 5000 : false },
  )

  const conceptCount = conceptData?.length ?? 0
  const hasSyllabus = Boolean(syllabusData?.units?.length)
  const lessonCount = lessons?.length ?? 0
  const totalTopics =
    syllabusData?.units?.reduce(
      (sum: number, u: { topics: unknown[] }) => sum + (u.topics?.length ?? 0),
      0,
    ) ?? 0

  const allDone = hasSyllabus && lessonCount > 0 && lessonCount >= totalTopics && !hasProcessing

  // Count completed steps to detect transitions
  const doneCount =
    (docCount > 0 ? 1 : 0) +
    (conceptCount > 0 ? 1 : 0) +
    (hasSyllabus ? 1 : 0) +
    (lessonCount >= totalTopics && totalTopics > 0 ? 1 : 0)

  // Refresh server-rendered page parts when a pipeline step completes
  useEffect(() => {
    if (doneCount > prevDoneCount.current && prevDoneCount.current > 0) {
      router.refresh()
    }
    prevDoneCount.current = doneCount
  }, [doneCount, router])

  // Don't show if nothing is happening and nothing has been built
  if (docCount === 0 && conceptCount === 0 && !hasProcessing) return null

  // Don't show if everything is complete
  if (allDone) return null

  const steps: PipelineStep[] = [
    {
      key: 'docs',
      label: 'Documents processed',
      icon: FileText,
      status: docCount > 0 ? 'done' : hasProcessing ? 'active' : 'pending',
      detail: docCount > 0 ? `${docCount} ready` : undefined,
    },
    {
      key: 'concepts',
      label: 'Concepts extracted',
      icon: Brain,
      status: conceptCount > 0 ? 'done' : docCount > 0 ? 'active' : 'pending',
      detail: conceptCount > 0 ? `${conceptCount} found` : undefined,
    },
    {
      key: 'syllabus',
      label: 'Syllabus created',
      icon: ListTree,
      status: hasSyllabus ? 'done' : conceptCount >= 2 ? 'active' : 'pending',
      detail: hasSyllabus ? `${totalTopics} topics` : undefined,
    },
    {
      key: 'lessons',
      label: 'Lessons generated',
      icon: BookOpen,
      status:
        lessonCount >= totalTopics && totalTopics > 0 ? 'done' : hasSyllabus ? 'active' : 'pending',
      detail:
        lessonCount > 0
          ? totalTopics > 0
            ? `${lessonCount}/${totalTopics}`
            : `${lessonCount}`
          : undefined,
    },
  ]

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-3 sm:p-5">
      <h3 className="text-sm font-bold mb-4 text-foreground">Building your learning path</h3>
      <div className="space-y-3">
        {steps.map((step) => {
          const Icon = step.icon
          return (
            <div key={step.key} className="flex items-center gap-3">
              <div className="shrink-0">
                {step.status === 'done' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                ) : step.status === 'active' ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground/30" />
                )}
              </div>
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  step.status === 'done'
                    ? 'text-emerald-500'
                    : step.status === 'active'
                      ? 'text-primary'
                      : 'text-muted-foreground/40'
                }`}
              />
              <span
                className={`text-sm flex-1 ${
                  step.status === 'done'
                    ? 'text-foreground'
                    : step.status === 'active'
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground/50'
                }`}
              >
                {step.label}
              </span>
              {step.detail && (
                <span
                  className={`text-xs font-medium ${
                    step.status === 'done' ? 'text-emerald-500' : 'text-primary'
                  }`}
                >
                  {step.detail}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

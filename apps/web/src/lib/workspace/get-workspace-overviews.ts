import { createServerCaller } from '@/lib/trpc/server'

type AppCaller = Awaited<ReturnType<typeof createServerCaller>>
type WorkspaceListItem = Awaited<ReturnType<AppCaller['workspace']['list']>>[number]

export interface WorkspaceOverview extends WorkspaceListItem {
  documentsCount: number
  conceptsCount: number
  lessonsCount: number
  completedLessonsCount: number
  tokenLabel: string
  progressLabel: string
  summary: string
  nextActionLabel: string
  nextActionHref: string
  statusTone: 'empty' | 'building' | 'active'
}

function formatTokenLabel(totalTokenCount: number, documentsCount: number): string {
  if (totalTokenCount <= 0) {
    return documentsCount > 0
      ? `${documentsCount} source ${documentsCount === 1 ? 'doc' : 'docs'} live`
      : 'No source material yet'
  }

  if (totalTokenCount >= 1_000_000) {
    return `${(totalTokenCount / 1_000_000).toFixed(1)}M tokens indexed`
  }

  if (totalTokenCount >= 1_000) {
    return `${Math.round(totalTokenCount / 1_000)}k tokens indexed`
  }

  return `${totalTokenCount} tokens indexed`
}

export async function getWorkspaceOverviews(
  caller: AppCaller,
  workspaces: WorkspaceListItem[],
): Promise<WorkspaceOverview[]> {
  return Promise.all(
    workspaces.map(async (workspace) => {
      const [documentsResult, conceptsResult, lessonsResult] = await Promise.allSettled([
        caller.document.list({ workspaceId: workspace.id as string }),
        caller.concept.list({ workspaceId: workspace.id as string }),
        caller.lesson.list({ workspaceId: workspace.id as string }),
      ])

      const documents = documentsResult.status === 'fulfilled' ? documentsResult.value : []
      const concepts = conceptsResult.status === 'fulfilled' ? conceptsResult.value : []
      const lessons = lessonsResult.status === 'fulfilled' ? lessonsResult.value : []
      const completedLessonsCount = lessons.filter((lesson) => lesson.is_completed).length

      let progressLabel = 'Ready for first upload'
      let summary = 'Add lecture slides, notes, or a syllabus to begin.'
      let nextActionLabel = 'Add materials'
      let nextActionHref = `/workspace/${workspace.id}?tab=documents`
      let statusTone: WorkspaceOverview['statusTone'] = 'empty'

      if (documents.length > 0 && lessons.length === 0) {
        progressLabel = `${documents.length} source ${documents.length === 1 ? 'document' : 'documents'} live`
        summary = `${concepts.length} concepts extracted and ready for lesson generation.`
        nextActionLabel = 'Review concepts'
        nextActionHref = `/workspace/${workspace.id}?tab=concepts`
        statusTone = 'building'
      }

      if (lessons.length > 0) {
        const remainingLessons = lessons.length - completedLessonsCount
        progressLabel = `${completedLessonsCount}/${lessons.length} lessons complete`
        summary =
          remainingLessons > 0
            ? `${documents.length} docs, ${concepts.length} concepts, ${remainingLessons} lesson${remainingLessons === 1 ? '' : 's'} still in motion.`
            : `${documents.length} docs and ${concepts.length} concepts are fully turned into study-ready lessons.`
        nextActionLabel = remainingLessons > 0 ? 'Continue learning' : 'Open workspace'
        nextActionHref =
          remainingLessons > 0
            ? `/workspace/${workspace.id}?tab=lessons`
            : `/workspace/${workspace.id}`
        statusTone = 'active'
      }

      return {
        ...workspace,
        documentsCount: documents.length,
        conceptsCount: concepts.length,
        lessonsCount: lessons.length,
        completedLessonsCount,
        tokenLabel: formatTokenLabel(
          (workspace.total_token_count as number) ?? 0,
          documents.length,
        ),
        progressLabel,
        summary,
        nextActionLabel,
        nextActionHref,
        statusTone,
      }
    }),
  )
}

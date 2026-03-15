import { TRPCError } from '@trpc/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import {
  listLessonsSchema,
  getLessonSchema,
  markCompleteSchema,
  triggerGenerateLessonsSchema,
} from '@learn-x/validators'

async function resolveUserId(supabase: SupabaseClient, authId: string): Promise<string> {
  const { data: user, error } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', authId)
    .single()
  if (error || !user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
  return user.id as string
}

async function resolveWorkspace(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
): Promise<string> {
  const { data: workspace, error } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .eq('user_id', userId)
    .single()
  if (error || !workspace)
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace not found' })
  return workspace.id as string
}

export const lessonRouter = createTRPCRouter({
  /**
   * List all lessons in a workspace, ordered by order_index.
   */
  list: protectedProcedure.input(listLessonsSchema).query(async ({ ctx, input }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)
    await resolveWorkspace(ctx.supabase, input.workspaceId, userId)

    const { data, error } = await ctx.supabase
      .from('lessons')
      .select('id, title, order_index, summary, is_completed, completed_at, created_at')
      .eq('workspace_id', input.workspaceId)
      .order('order_index', { ascending: true })

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
    return data ?? []
  }),

  /**
   * Get a single lesson with full structured_sections.
   */
  get: protectedProcedure.input(getLessonSchema).query(async ({ ctx, input }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)
    await resolveWorkspace(ctx.supabase, input.workspaceId, userId)

    const { data, error } = await ctx.supabase
      .from('lessons')
      .select('*')
      .eq('id', input.id)
      .eq('workspace_id', input.workspaceId)
      .single()

    if (error || !data) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lesson not found' })

    return {
      id: data.id as string,
      workspaceId: data.workspace_id as string,
      title: data.title as string,
      orderIndex: data.order_index as number,
      contentMarkdown: data.content_markdown as string,
      structuredSections: data.structured_sections as unknown[],
      summary: data.summary as string | null,
      keyTakeaways: data.key_takeaways as string[] | null,
      promptVersion: data.prompt_version as string | null,
      modelUsed: data.model_used as string | null,
      isCompleted: data.is_completed as boolean,
      completedAt: data.completed_at as string | null,
      syllabusTopicId: data.syllabus_topic_id as string | null,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    }
  }),

  /**
   * Mark a lesson as complete.
   */
  markComplete: protectedProcedure.input(markCompleteSchema).mutation(async ({ ctx, input }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)
    await resolveWorkspace(ctx.supabase, input.workspaceId, userId)

    const { data, error } = await ctx.supabase
      .from('lessons')
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.id)
      .eq('workspace_id', input.workspaceId)
      .select('id, is_completed, completed_at')
      .single()

    if (error || !data) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lesson not found' })

    return {
      id: data.id as string,
      isCompleted: data.is_completed as boolean,
      completedAt: data.completed_at as string | null,
    }
  }),

  /**
   * Enqueue lesson generation job for a workspace.
   * Creates a jobs row and best-effort triggers Trigger.dev.
   */
  triggerGenerate: protectedProcedure
    .input(triggerGenerateLessonsSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)
      await resolveWorkspace(ctx.supabase, input.workspaceId, userId)

      // Create a job row for progress tracking
      const { data: job, error: jobError } = await ctx.supabase
        .from('jobs')
        .insert({
          workspace_id: input.workspaceId,
          user_id: userId,
          type: 'generate_lessons',
          status: 'pending',
          progress: 0,
        })
        .select('id')
        .single()

      if (jobError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

      // Best-effort: trigger the Trigger.dev job
      try {
        const { generateLessons } = await import('@/../../../trigger/src/jobs/generate-lessons')
        await generateLessons.trigger({ workspaceId: input.workspaceId, userId })
      } catch {
        // TRIGGER_SECRET_KEY not set in dev/test — job row still created
      }

      return { jobId: job!.id as string, status: 'queued' as const }
    }),
})

import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'

import { createTRPCRouter, protectedProcedure } from '../trpc'

async function resolveUserId(supabase: SupabaseClient, authId: string): Promise<string> {
  const { data: user, error } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', authId)
    .single()
  if (error || !user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
  return user.id
}

async function resolveWorkspace(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
): Promise<void> {
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .eq('user_id', userId)
    .single()
  if (!workspace) throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace not found' })
}

const workspaceInput = z.object({ workspaceId: z.string().uuid() })

export const masteryRouter = createTRPCRouter({
  getWorkspaceSummary: protectedProcedure.input(workspaceInput).query(async ({ ctx, input }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)
    await resolveWorkspace(ctx.supabase, input.workspaceId, userId)

    const { data, error } = await ctx.supabase.rpc('get_workspace_mastery_summary', {
      p_workspace_id: input.workspaceId,
    })

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

    const summary = data as {
      total_concepts: number
      mastered: number
      struggling: number
      due_reviews: number
      avg_mastery: number
    }

    return {
      totalConcepts: summary.total_concepts ?? 0,
      mastered: summary.mastered ?? 0,
      struggling: summary.struggling ?? 0,
      dueReviews: summary.due_reviews ?? 0,
      avgMastery: summary.avg_mastery ?? 0,
    }
  }),

  getWeakConcepts: protectedProcedure
    .input(workspaceInput.extend({ limit: z.number().int().positive().optional() }))
    .query(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)
      await resolveWorkspace(ctx.supabase, input.workspaceId, userId)

      const { data, error } = await ctx.supabase.rpc('get_weak_concepts', {
        p_workspace_id: input.workspaceId,
        p_limit: input.limit ?? 10,
      })

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      return (data ?? []) as Array<{
        concept_id: string
        concept_name: string
        avg_lapses: number
        avg_stability: number
        card_count: number
      }>
    }),

  /**
   * Trigger remediation job for a weak concept, returns lessonId when ready.
   */
  getRemediationPath: protectedProcedure
    .input(workspaceInput.extend({ conceptId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)
      await resolveWorkspace(ctx.supabase, input.workspaceId, userId)

      const { data: job, error: jobError } = await ctx.supabase
        .from('jobs')
        .insert({
          workspace_id: input.workspaceId,
          user_id: userId,
          type: 'generate_remediation',
          status: 'pending',
          progress: 0,
          metadata: { conceptId: input.conceptId },
        })
        .select('id')
        .single()

      if (jobError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

      try {
        const { generateRemediation } =
          await import('@/../../../trigger/src/jobs/generate-remediation')
        await generateRemediation.trigger({
          workspaceId: input.workspaceId,
          conceptId: input.conceptId,
          userId,
        })
      } catch {
        // TRIGGER_SECRET_KEY not set in dev/test
      }

      return { jobId: job!.id as string, status: 'queued' as const }
    }),

  getWhatToStudyNext: protectedProcedure.input(workspaceInput).query(async ({ ctx, input }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)
    await resolveWorkspace(ctx.supabase, input.workspaceId, userId)

    const items: Array<{ type: string; id: string; title: string; reason: string }> = []

    // 1. Due flashcard sets
    const { data: dueSets } = await ctx.supabase
      .from('flashcard_sets')
      .select(
        `id, title,
           flashcards!inner(id, due_at)`,
      )
      .eq('workspace_id', input.workspaceId)
      .lte('flashcards.due_at', new Date().toISOString())
      .limit(2)

    for (const s of dueSets ?? []) {
      items.push({
        type: 'flashcard_set',
        id: s.id,
        title: s.title,
        reason: 'Cards due for review',
      })
    }

    // 2. Unstarted lessons
    const { data: lessons } = await ctx.supabase
      .from('lessons')
      .select('id, title')
      .eq('workspace_id', input.workspaceId)
      .eq('status', 'ready')
      .limit(1)

    for (const l of lessons ?? []) {
      items.push({ type: 'lesson', id: l.id, title: l.title, reason: 'New lesson available' })
    }

    return items.slice(0, 3)
  }),
})

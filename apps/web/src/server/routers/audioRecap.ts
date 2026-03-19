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
  return user.id as string
}

async function resolveWorkspace(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
): Promise<string> {
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .eq('user_id', userId)
    .single()
  if (!workspace) throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace not found' })
  return workspace.id as string
}

export const audioRecapRouter = createTRPCRouter({
  /**
   * Get audio recap for a specific lesson; returns null if none exists.
   */
  get: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().uuid(),
        lessonId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)
      await resolveWorkspace(ctx.supabase, input.workspaceId, userId)

      const { data } = await ctx.supabase
        .from('audio_recaps')
        .select('id, title, storage_url, duration_seconds, status, transcript, created_at')
        .eq('workspace_id', input.workspaceId)
        .eq('lesson_id', input.lessonId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      return data ?? null
    }),

  /**
   * List all audio recaps for a workspace.
   */
  list: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)
      await resolveWorkspace(ctx.supabase, input.workspaceId, userId)

      const { data } = await ctx.supabase
        .from('audio_recaps')
        .select(
          'id, title, storage_url, duration_seconds, status, lesson_id, document_id, created_at',
        )
        .eq('workspace_id', input.workspaceId)
        .order('created_at', { ascending: false })

      return data ?? []
    }),

  /**
   * Trigger audio recap generation for a lesson.
   */
  generate: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().uuid(),
        lessonId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)
      await resolveWorkspace(ctx.supabase, input.workspaceId, userId)

      const { data: lesson } = await ctx.supabase
        .from('lessons')
        .select('id')
        .eq('id', input.lessonId)
        .eq('workspace_id', input.workspaceId)
        .maybeSingle()
      if (!lesson) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lesson not found' })

      const { data: job, error: jobError } = await ctx.supabase
        .from('jobs')
        .insert({
          workspace_id: input.workspaceId,
          user_id: userId,
          type: 'generate_audio_recap',
          status: 'pending',
          progress: 0,
        })
        .select('id')
        .single()

      if (jobError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

      try {
        const { generateAudioRecap } =
          await import('@/../../../trigger/src/jobs/generate-audio-recap')
        await generateAudioRecap.trigger({
          workspaceId: input.workspaceId,
          lessonId: input.lessonId,
          userId,
        })
      } catch {
        // TRIGGER_SECRET_KEY not set in dev/test — job row still created
      }

      return { jobId: job!.id as string, status: 'queued' as const }
    }),
})

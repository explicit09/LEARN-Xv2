import { TRPCError } from '@trpc/server'
import type { SupabaseClient } from '@supabase/supabase-js'

import { createTRPCRouter, protectedProcedure } from '../trpc'
import {
  generatePodcastSchema,
  getPodcastSchema,
  getPodcastByIdSchema,
  listPodcastsSchema,
  listAllPodcastsSchema,
  deletePodcastSchema,
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
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .eq('user_id', userId)
    .single()
  if (!workspace) throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace not found' })
  return workspace.id as string
}

const PODCAST_COLUMNS =
  'id, title, storage_url, duration_seconds, status, transcript, format, progress, tts_provider, lesson_id, document_id, workspace_id, created_at'

export const podcastRouter = createTRPCRouter({
  /** Get podcast for a specific lesson; returns null if none exists. */
  get: protectedProcedure.input(getPodcastSchema).query(async ({ ctx, input }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)
    await resolveWorkspace(ctx.supabase, input.workspaceId, userId)

    const { data } = await ctx.supabase
      .from('podcasts')
      .select(PODCAST_COLUMNS)
      .eq('workspace_id', input.workspaceId)
      .eq('lesson_id', input.lessonId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return data ?? null
  }),

  /** Get podcast by ID. */
  getById: protectedProcedure.input(getPodcastByIdSchema).query(async ({ ctx, input }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)

    const { data } = await ctx.supabase
      .from('podcasts')
      .select(
        `${PODCAST_COLUMNS}, podcast_segments(id, segment_index, speaker, text, audio_url, duration_seconds, start_time, end_time, concept_id)`,
      )
      .eq('id', input.podcastId)
      .maybeSingle()

    if (!data) return null

    // Verify user owns the workspace
    await resolveWorkspace(ctx.supabase, data.workspace_id, userId)
    return data
  }),

  /** List podcasts for a workspace (cursor-paginated). */
  list: protectedProcedure.input(listPodcastsSchema).query(async ({ ctx, input }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)
    await resolveWorkspace(ctx.supabase, input.workspaceId, userId)

    let query = ctx.supabase
      .from('podcasts')
      .select(PODCAST_COLUMNS)
      .eq('workspace_id', input.workspaceId)
      .order('created_at', { ascending: false })
      .limit(input.limit)

    if (input.status) {
      query = query.eq('status', input.status)
    }
    if (input.cursor) {
      const { data: cursorRow } = await ctx.supabase
        .from('podcasts')
        .select('created_at')
        .eq('id', input.cursor)
        .single()
      if (cursorRow) {
        query = query.lt('created_at', cursorRow.created_at)
      }
    }

    const { data } = await query
    return data ?? []
  }),

  /** List all podcasts across all user's workspaces. */
  listAll: protectedProcedure.input(listAllPodcastsSchema).query(async ({ ctx, input }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)

    let query = ctx.supabase
      .from('podcasts')
      .select(`${PODCAST_COLUMNS}, workspaces(name)`)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(input.limit)

    if (input.cursor) {
      const { data: cursorRow } = await ctx.supabase
        .from('podcasts')
        .select('created_at')
        .eq('id', input.cursor)
        .single()
      if (cursorRow) {
        query = query.lt('created_at', cursorRow.created_at)
      }
    }

    const { data } = await query
    return data ?? []
  }),

  /** Trigger podcast generation for a lesson. */
  generate: protectedProcedure.input(generatePodcastSchema).mutation(async ({ ctx, input }) => {
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
        type: 'generate_podcast',
        status: 'pending',
        progress: 0,
      })
      .select('id')
      .single()

    if (jobError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

    try {
      const { generatePodcast } = await import('@/../../../trigger/src/jobs/generate-podcast')
      await generatePodcast.trigger({
        workspaceId: input.workspaceId,
        lessonId: input.lessonId,
        userId,
        format: input.format,
        ...(input.ttsProvider ? { ttsProvider: input.ttsProvider } : {}),
      })
    } catch {
      // TRIGGER_SECRET_KEY not set in dev/test — job row still created
    }

    return { jobId: job!.id as string, status: 'queued' as const }
  }),

  /** Delete a podcast and its storage files. */
  delete: protectedProcedure.input(deletePodcastSchema).mutation(async ({ ctx, input }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)

    const { data: podcast } = await ctx.supabase
      .from('podcasts')
      .select('id, workspace_id, storage_url')
      .eq('id', input.podcastId)
      .maybeSingle()

    if (!podcast) throw new TRPCError({ code: 'NOT_FOUND', message: 'Podcast not found' })

    await resolveWorkspace(ctx.supabase, podcast.workspace_id, userId)

    // Delete storage files (best-effort)
    if (podcast.storage_url) {
      const prefix = `podcasts/${podcast.workspace_id}/${podcast.id}`
      const { data: files } = await ctx.supabase.storage.from('audio-recaps').list(prefix)
      if (files?.length) {
        await ctx.supabase.storage
          .from('audio-recaps')
          .remove(files.map((f) => `${prefix}/${f.name}`))
      }
    }

    // Cascade deletes podcast_segments via FK
    await ctx.supabase.from('podcasts').delete().eq('id', input.podcastId)

    return { deleted: true }
  }),
})

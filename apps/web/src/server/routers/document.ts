import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { initiateUploadSchema, confirmUploadSchema } from '@learn-x/validators'

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
): Promise<string> {
  const { data: workspace, error } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .eq('user_id', userId)
    .single()
  if (error || !workspace)
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace not found' })
  return workspace.id
}

export const documentRouter = createTRPCRouter({
  initiateUpload: protectedProcedure
    .input(initiateUploadSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)
      await resolveWorkspace(ctx.supabase, input.workspaceId, userId)

      // Create placeholder document row
      const storagePath = `${userId}/${crypto.randomUUID()}/${input.title.replace(/[^a-zA-Z0-9._-]/g, '_')}.${input.fileType}`

      const { data: document, error: docError } = await ctx.supabase
        .from('documents')
        .insert({
          workspace_id: input.workspaceId,
          user_id: userId,
          title: input.title,
          file_type: input.fileType,
          file_url: storagePath,
          status: 'uploading',
          ...(input.uploadBatchId ? { upload_batch_id: input.uploadBatchId } : {}),
        })
        .select()
        .single()
      if (docError || !document) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

      // Generate signed upload URL
      const { data: uploadData, error: storageError } = await ctx.supabase.storage
        .from('documents')
        .createSignedUploadUrl(storagePath)
      if (storageError || !uploadData) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

      return {
        documentId: document.id as string,
        signedUploadUrl: uploadData.signedUrl,
        storagePath,
      }
    }),

  confirmUpload: protectedProcedure.input(confirmUploadSchema).mutation(async ({ ctx, input }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)

    // Verify ownership via workspace
    const { data: doc, error: fetchError } = await ctx.supabase
      .from('documents')
      .select('id, workspace_id')
      .eq('id', input.documentId)
      .eq('user_id', userId)
      .single()
    if (fetchError || !doc)
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' })

    // Update status to processing
    const { data: updated, error: updateError } = await ctx.supabase
      .from('documents')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', input.documentId)
      .select()
      .single()
    if (updateError || !updated) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

    // Create job row
    const { data: job, error: jobError } = await ctx.supabase
      .from('jobs')
      .insert({
        workspace_id: doc.workspace_id,
        user_id: userId,
        type: 'process-document',
        status: 'pending',
        progress: 0,
        metadata: { document_id: input.documentId },
      })
      .select()
      .single()
    if (jobError || !job) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

    // Trigger Trigger.dev job (best-effort — don't fail if TRIGGER_SECRET_KEY is absent)
    try {
      const { tasks } = await import('@trigger.dev/sdk/v3')
      const handle = await tasks.trigger('process-document', {
        documentId: input.documentId,
        jobId: job.id,
      })
      // Store the Trigger.dev run ID in the job row
      await ctx.supabase.from('jobs').update({ task_id: handle.id }).eq('id', job.id)
    } catch {
      // No TRIGGER_SECRET_KEY in test/dev env — job row still exists, worker picks it up
    }

    return { document: updated, jobId: job.id as string }
  }),

  list: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)
      await resolveWorkspace(ctx.supabase, input.workspaceId, userId)

      const { data: docs, error } = await ctx.supabase
        .from('documents')
        .select('*')
        .eq('workspace_id', input.workspaceId)
        .order('created_at', { ascending: false })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      return docs ?? []
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)

      const { data: document, error } = await ctx.supabase
        .from('documents')
        .select('*')
        .eq('id', input.id)
        .eq('user_id', userId)
        .single()
      if (error || !document)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' })

      // Fetch latest job
      const { data: job } = await ctx.supabase
        .from('jobs')
        .select('*')
        .eq('metadata->>document_id', input.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      return { ...document, job: job ?? null }
    }),

  retryProcessing: protectedProcedure
    .input(z.object({ documentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)

      const { data: doc, error: fetchError } = await ctx.supabase
        .from('documents')
        .select('id, workspace_id, status')
        .eq('id', input.documentId)
        .eq('user_id', userId)
        .single()
      if (fetchError || !doc)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' })
      if (doc.status !== 'failed')
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only failed documents can be retried',
        })

      await ctx.supabase
        .from('documents')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', input.documentId)

      const { data: job, error: jobError } = await ctx.supabase
        .from('jobs')
        .insert({
          workspace_id: doc.workspace_id,
          user_id: userId,
          type: 'process-document',
          status: 'pending',
          progress: 0,
          metadata: { document_id: input.documentId },
        })
        .select()
        .single()
      if (jobError || !job) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

      try {
        const { tasks } = await import('@trigger.dev/sdk/v3')
        const handle = await tasks.trigger('process-document', {
          documentId: input.documentId,
          jobId: job.id,
        })
        await ctx.supabase.from('jobs').update({ task_id: handle.id }).eq('id', job.id)
      } catch {
        // No TRIGGER_SECRET_KEY in test/dev env
      }

      return { jobId: job.id as string }
    }),

  ingestUrl: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().uuid(),
        url: z.string().url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)
      await resolveWorkspace(ctx.supabase, input.workspaceId, userId)

      const isYouTube = /^https?:\/\/(www\.)?(youtube\.com\/watch|youtu\.be\/)/.test(input.url)
      const title = isYouTube ? 'YouTube Video' : new URL(input.url).hostname

      const { data: document, error: docError } = await ctx.supabase
        .from('documents')
        .insert({
          workspace_id: input.workspaceId,
          user_id: userId,
          title,
          file_type: 'html',
          file_url: input.url,
          status: 'processing',
          metadata: { source_url: input.url, is_youtube: isYouTube },
        })
        .select()
        .single()
      if (docError || !document) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

      const { data: job, error: jobError } = await ctx.supabase
        .from('jobs')
        .insert({
          workspace_id: input.workspaceId,
          user_id: userId,
          type: 'process-document',
          status: 'pending',
          progress: 0,
          metadata: { document_id: document.id, source_url: input.url, is_youtube: isYouTube },
        })
        .select()
        .single()
      if (jobError || !job) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

      try {
        const { tasks } = await import('@trigger.dev/sdk/v3')
        const handle = await tasks.trigger('process-document', {
          documentId: document.id,
          jobId: job.id,
        })
        await ctx.supabase.from('jobs').update({ task_id: handle.id }).eq('id', job.id)
      } catch {
        // No TRIGGER_SECRET_KEY in test/dev env
      }

      return { documentId: document.id as string, jobId: job.id as string }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)

      // Fetch to get the storage path before deleting
      const { data: doc } = await ctx.supabase
        .from('documents')
        .select('file_url')
        .eq('id', input.id)
        .eq('user_id', userId)
        .single()

      const { error } = await ctx.supabase
        .from('documents')
        .delete()
        .eq('id', input.id)
        .eq('user_id', userId)
      if (error) throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' })

      // Remove from storage (best-effort)
      if (doc?.file_url) {
        await ctx.supabase.storage.from('documents').remove([doc.file_url])
      }

      return { success: true }
    }),
})

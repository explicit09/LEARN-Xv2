import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { createWorkspaceSchema, updateWorkspaceSchema } from '@learn-x/validators'

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

export const workspaceRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createWorkspaceSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)
      const { data: workspace, error } = await ctx.supabase
        .from('workspaces')
        .insert({
          user_id: userId,
          name: input.name,
          description: input.description,
          status: input.status,
          settings: input.settings,
          total_token_count: input.totalTokenCount,
        })
        .select()
        .single()
      if (error || !workspace) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      return workspace
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)
    const { data: workspaces, error } = await ctx.supabase
      .from('workspaces')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
    return workspaces ?? []
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)
      const { data: workspace, error } = await ctx.supabase
        .from('workspaces')
        .select('*')
        .eq('id', input.id)
        .eq('user_id', userId)
        .single()
      if (error || !workspace) throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace not found' })
      return workspace
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid(), data: updateWorkspaceSchema }))
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)
      const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (input.data.name !== undefined) update.name = input.data.name
      if (input.data.description !== undefined) update.description = input.data.description
      if (input.data.status !== undefined) update.status = input.data.status

      const { data: workspace, error } = await ctx.supabase
        .from('workspaces')
        .update(update)
        .eq('id', input.id)
        .eq('user_id', userId)
        .select()
        .single()
      if (error || !workspace) throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace not found' })
      return workspace
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)
      const { error } = await ctx.supabase
        .from('workspaces')
        .delete()
        .eq('id', input.id)
        .eq('user_id', userId)
      if (error) throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace not found' })
      return { success: true }
    }),
})

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

export const conceptRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)
      await resolveWorkspace(ctx.supabase, input.workspaceId, userId)

      const { data, error } = await ctx.supabase
        .from('concepts')
        .select('*')
        .eq('workspace_id', input.workspaceId)
        .order('name', { ascending: true })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      return data ?? []
    }),
})

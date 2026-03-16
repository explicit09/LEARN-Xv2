import { TRPCError } from '@trpc/server'
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

async function assertAdmin(supabase: SupabaseClient, userId: string): Promise<void> {
  const { data: role } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle()
  if (!role || role.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' })
  }
}

export const adminRouter = createTRPCRouter({
  /**
   * Get platform usage statistics (admin only).
   */
  getUsageStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)
    await assertAdmin(ctx.supabase, userId)

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [
      { count: totalUsers },
      { count: totalWorkspaces },
      { count: totalDocuments },
      { count: aiRequests30d },
    ] = await Promise.all([
      ctx.supabase.from('users').select('*', { count: 'exact', head: true }),
      ctx.supabase.from('workspaces').select('*', { count: 'exact', head: true }),
      ctx.supabase.from('documents').select('*', { count: 'exact', head: true }),
      ctx.supabase
        .from('ai_requests')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo),
    ])

    return {
      totalUsers: totalUsers ?? 0,
      totalWorkspaces: totalWorkspaces ?? 0,
      totalDocuments: totalDocuments ?? 0,
      aiRequests30d: aiRequests30d ?? 0,
    }
  }),

  /**
   * List all users with their roles (admin only).
   */
  listUsers: protectedProcedure.query(async ({ ctx }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)
    await assertAdmin(ctx.supabase, userId)

    const { data: users } = await ctx.supabase
      .from('users')
      .select('id, email, display_name, created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    return (users ?? []).map((u) => ({
      id: u.id as string,
      email: u.email as string,
      displayName: u.display_name as string | null,
      createdAt: u.created_at as string,
    }))
  }),
})

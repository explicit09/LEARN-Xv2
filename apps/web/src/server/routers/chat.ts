import { TRPCError } from '@trpc/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import {
  createChatSessionSchema,
  listChatSessionsSchema,
  getChatSessionSchema,
  deleteChatSessionSchema,
} from '@learn-x/validators'

async function resolveUserId(supabase: SupabaseClient, authId: string): Promise<string> {
  const { data: user, error } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', authId)
    .single()
  if (error ?? !user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
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
  if (error ?? !workspace) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace not found' })
  }
  return workspace.id as string
}

export const chatRouter = createTRPCRouter({
  createSession: protectedProcedure
    .input(createChatSessionSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)
      await resolveWorkspace(ctx.supabase, input.workspaceId, userId)

      const insertData: Record<string, string> = {
        workspace_id: input.workspaceId,
        user_id: userId,
      }
      if (input.lessonId) insertData['lesson_id'] = input.lessonId

      const { data, error } = await ctx.supabase
        .from('chat_sessions')
        .insert(insertData)
        .select()
        .single()

      if (error ?? !data) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create session' })
      }
      return data
    }),

  listSessions: protectedProcedure.input(listChatSessionsSchema).query(async ({ ctx, input }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)
    await resolveWorkspace(ctx.supabase, input.workspaceId, userId)

    const { data, error } = await ctx.supabase
      .from('chat_sessions')
      .select('*')
      .eq('workspace_id', input.workspaceId)
      .order('updated_at', { ascending: false })

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  getSession: protectedProcedure.input(getChatSessionSchema).query(async ({ ctx, input }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)
    await resolveWorkspace(ctx.supabase, input.workspaceId, userId)

    const { data: session, error } = await ctx.supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', input.id)
      .eq('workspace_id', input.workspaceId)
      .single()

    if (error ?? !session) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' })
    }

    const { data: messages, error: msgError } = await ctx.supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', input.id)
      .order('created_at', { ascending: true })

    if (msgError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: msgError.message })
    }

    return { ...session, messages: messages ?? [] }
  }),

  deleteSession: protectedProcedure
    .input(deleteChatSessionSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)
      await resolveWorkspace(ctx.supabase, input.workspaceId, userId)

      const { error } = await ctx.supabase
        .from('chat_sessions')
        .delete()
        .eq('id', input.id)
        .eq('workspace_id', input.workspaceId)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),
})

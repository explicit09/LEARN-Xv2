import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  createRoomSchema,
  joinRoomSchema,
  sendRoomMessageSchema,
  listRoomsSchema,
} from '@learn-x/validators'

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

export const studyRoomRouter = createTRPCRouter({
  /**
   * List open study rooms for a course.
   */
  list: protectedProcedure.input(listRoomsSchema).query(async ({ ctx, input }) => {
    await resolveUserId(ctx.supabase, ctx.user.id)

    const { data: rooms } = await ctx.supabase
      .from('study_rooms')
      .select('id, topic, status, created_at, host_user_id')
      .eq('course_id', input.courseId)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(20)

    if (!rooms) return []

    // Get member counts
    const roomIds = rooms.map((r) => r.id as string)
    const { data: members } = await ctx.supabase
      .from('study_room_members')
      .select('room_id')
      .in('room_id', roomIds)

    const memberCountMap: Record<string, number> = {}
    for (const m of members ?? []) {
      const rid = m.room_id as string
      memberCountMap[rid] = (memberCountMap[rid] ?? 0) + 1
    }

    return rooms.map((r) => ({
      id: r.id as string,
      topic: r.topic as string | null,
      status: r.status as string,
      createdAt: r.created_at as string,
      hostUserId: r.host_user_id as string,
      memberCount: memberCountMap[r.id as string] ?? 0,
    }))
  }),

  /**
   * Create a study room (must be enrolled in course).
   */
  create: protectedProcedure.input(createRoomSchema).mutation(async ({ ctx, input }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)

    // Verify enrollment
    const { data: enrollment } = await ctx.supabase
      .from('course_enrollments')
      .select('status')
      .eq('course_id', input.courseId)
      .eq('user_id', userId)
      .maybeSingle()

    if (!enrollment || enrollment.status !== 'active') {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Course not found or not enrolled' })
    }

    const { data: room, error } = await ctx.supabase
      .from('study_rooms')
      .insert({
        course_id: input.courseId,
        host_user_id: userId,
        topic: input.topic ?? null,
        status: 'open',
      })
      .select('id, topic, status, created_at')
      .single()

    if (error || !room) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

    // Auto-join the creator
    await ctx.supabase
      .from('study_room_members')
      .insert({ room_id: room.id as string, user_id: userId })
      .select()

    return {
      id: room.id as string,
      topic: room.topic as string | null,
      status: room.status as string,
      createdAt: room.created_at as string,
    }
  }),

  /**
   * Join a study room.
   */
  join: protectedProcedure.input(joinRoomSchema).mutation(async ({ ctx, input }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)

    const { data: room } = await ctx.supabase
      .from('study_rooms')
      .select('id, status, course_id')
      .eq('id', input.roomId)
      .maybeSingle()

    if (!room) throw new TRPCError({ code: 'NOT_FOUND', message: 'Room not found' })
    if (room.status !== 'open') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Room is closed' })
    }

    const { error } = await ctx.supabase
      .from('study_room_members')
      .upsert({ room_id: input.roomId, user_id: userId }, { onConflict: 'room_id,user_id' })

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return { success: true, roomId: input.roomId }
  }),

  /**
   * Leave a study room.
   */
  leave: protectedProcedure
    .input(z.object({ roomId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)
      await ctx.supabase
        .from('study_room_members')
        .delete()
        .eq('room_id', input.roomId)
        .eq('user_id', userId)
      return { success: true }
    }),

  /**
   * Close a study room (host only).
   */
  close: protectedProcedure
    .input(z.object({ roomId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)

      const { data: room } = await ctx.supabase
        .from('study_rooms')
        .select('host_user_id')
        .eq('id', input.roomId)
        .maybeSingle()

      if (!room) throw new TRPCError({ code: 'NOT_FOUND', message: 'Room not found' })
      if (room.host_user_id !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the host can close this room' })
      }

      await ctx.supabase.from('study_rooms').update({ status: 'closed' }).eq('id', input.roomId)

      return { success: true }
    }),

  /**
   * Send a message in a study room.
   */
  sendMessage: protectedProcedure.input(sendRoomMessageSchema).mutation(async ({ ctx, input }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)

    // Verify membership
    const { data: member } = await ctx.supabase
      .from('study_room_members')
      .select('user_id')
      .eq('room_id', input.roomId)
      .eq('user_id', userId)
      .maybeSingle()

    if (!member) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not in this room' })
    }

    const { data: msg, error } = await ctx.supabase
      .from('study_room_messages')
      .insert({ room_id: input.roomId, user_id: userId, content: input.content })
      .select('id, content, created_at')
      .single()

    if (error || !msg) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
    return {
      id: msg.id as string,
      content: msg.content as string,
      createdAt: msg.created_at as string,
      userId,
    }
  }),

  /**
   * Get recent messages in a study room.
   */
  getMessages: protectedProcedure
    .input(
      z.object({ roomId: z.string().uuid(), limit: z.number().int().min(1).max(100).optional() }),
    )
    .query(async ({ ctx, input }) => {
      await resolveUserId(ctx.supabase, ctx.user.id)

      const { data: messages } = await ctx.supabase
        .from('study_room_messages')
        .select('id, content, created_at, user_id')
        .eq('room_id', input.roomId)
        .order('created_at', { ascending: true })
        .limit(input.limit ?? 50)

      return (messages ?? []).map((m) => ({
        id: m.id as string,
        content: m.content as string,
        createdAt: m.created_at as string,
        userId: m.user_id as string,
      }))
    }),

  /**
   * Get study room details + members.
   */
  get: protectedProcedure
    .input(z.object({ roomId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await resolveUserId(ctx.supabase, ctx.user.id)

      const { data: room } = await ctx.supabase
        .from('study_rooms')
        .select('id, topic, status, created_at, host_user_id, course_id')
        .eq('id', input.roomId)
        .maybeSingle()

      if (!room) throw new TRPCError({ code: 'NOT_FOUND', message: 'Room not found' })

      const { data: members } = await ctx.supabase
        .from('study_room_members')
        .select('user_id, joined_at')
        .eq('room_id', input.roomId)

      return {
        id: room.id as string,
        topic: room.topic as string | null,
        status: room.status as string,
        createdAt: room.created_at as string,
        hostUserId: room.host_user_id as string,
        courseId: room.course_id as string,
        members: (members ?? []).map((m) => ({
          userId: m.user_id as string,
          joinedAt: m.joined_at as string,
        })),
      }
    }),
})

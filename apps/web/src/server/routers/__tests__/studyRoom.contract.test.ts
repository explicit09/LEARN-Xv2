/**
 * Contract tests for studyRoom router.
 * Requires: Supabase running with Phase 3B migration applied.
 *
 * Run: pnpm --filter web test:contract
 */
import { TRPCError } from '@trpc/server'
import { describe, expect, it } from 'vitest'

import { createCallerFactory } from '../../trpc'
import { appRouter } from '../_app'
import { createTestContext } from './_test-helpers'

const createCaller = createCallerFactory(appRouter)

describe('studyRoom.list', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.studyRoom.list({
        courseId: '00000000-0000-0000-0000-000000000001',
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })
})

describe('studyRoom.create', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.studyRoom.create({
        courseId: '00000000-0000-0000-0000-000000000001',
        topic: 'Exam prep',
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('throws NOT_FOUND for course user is not enrolled in', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    await expect(
      caller.studyRoom.create({
        courseId: '00000000-0000-0000-0000-000000000001',
      }),
    ).rejects.toThrow(expect.objectContaining({ code: 'NOT_FOUND' } satisfies Partial<TRPCError>))
  })
})

describe('studyRoom.join', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.studyRoom.join({ roomId: '00000000-0000-0000-0000-000000000001' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('throws NOT_FOUND for non-existent room', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    await expect(
      caller.studyRoom.join({ roomId: '00000000-0000-0000-0000-000000000001' }),
    ).rejects.toThrow(expect.objectContaining({ code: 'NOT_FOUND' } satisfies Partial<TRPCError>))
  })

  it('rejects joining a room for a course the user is not enrolled in', async () => {
    const ownerCtx = await createTestContext({ authenticated: true })
    const outsiderCtx = await createTestContext({ authenticated: true })

    try {
      const ownerCaller = createCaller(ownerCtx)
      const outsiderCaller = createCaller(outsiderCtx)

      const { data: ownerUser } = await ownerCtx.supabase
        .from('users')
        .select('id')
        .eq('auth_id', ownerCtx.user!.id)
        .single()

      const { data: instructorProfile } = await ownerCtx.supabase
        .from('instructor_profiles')
        .insert({ user_id: ownerUser!.id, institution: 'Test U' })
        .select('id')
        .single()

      const { data: course } = await ownerCtx.supabase
        .from('courses')
        .insert({
          instructor_id: instructorProfile!.id,
          title: 'Private Study Room Course',
          status: 'active',
        })
        .select('id')
        .single()

      await ownerCtx.supabase.from('course_enrollments').insert({
        course_id: course!.id,
        user_id: ownerUser!.id,
        status: 'active',
      })

      const room = await ownerCaller.studyRoom.create({
        courseId: course!.id as string,
        topic: 'Private room',
      })

      await expect(outsiderCaller.studyRoom.join({ roomId: room.id })).rejects.toThrow(
        expect.objectContaining({ code: 'FORBIDDEN' } satisfies Partial<TRPCError>),
      )
    } finally {
      await outsiderCtx._cleanup?.()
      await ownerCtx._cleanup?.()
    }
  })
})

describe('studyRoom.getMessages', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.studyRoom.getMessages({ roomId: '00000000-0000-0000-0000-000000000001' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('rejects users who are not enrolled or members of the room', async () => {
    const ownerCtx = await createTestContext({ authenticated: true })
    const outsiderCtx = await createTestContext({ authenticated: true })

    try {
      const ownerCaller = createCaller(ownerCtx)
      const outsiderCaller = createCaller(outsiderCtx)

      const { data: ownerUser } = await ownerCtx.supabase
        .from('users')
        .select('id')
        .eq('auth_id', ownerCtx.user!.id)
        .single()
      const { data: outsiderUser } = await outsiderCtx.supabase
        .from('users')
        .select('id')
        .eq('auth_id', outsiderCtx.user!.id)
        .single()

      expect(ownerUser).toBeTruthy()
      expect(outsiderUser).toBeTruthy()

      const { data: instructorProfile } = await ownerCtx.supabase
        .from('instructor_profiles')
        .insert({ user_id: ownerUser!.id, institution: 'Test U' })
        .select('id')
        .single()

      const { data: course } = await ownerCtx.supabase
        .from('courses')
        .insert({
          instructor_id: instructorProfile!.id,
          title: 'Private Course',
          status: 'active',
        })
        .select('id')
        .single()

      await ownerCtx.supabase.from('course_enrollments').insert({
        course_id: course!.id,
        user_id: ownerUser!.id,
        status: 'active',
      })

      const room = await ownerCaller.studyRoom.create({
        courseId: course!.id as string,
        topic: 'Closed circle',
      })

      await ownerCaller.studyRoom.sendMessage({
        roomId: room.id,
        content: 'members only',
      })

      await expect(outsiderCaller.studyRoom.getMessages({ roomId: room.id })).rejects.toThrow(
        expect.objectContaining({ code: 'FORBIDDEN' } satisfies Partial<TRPCError>),
      )
    } finally {
      await outsiderCtx._cleanup?.()
      await ownerCtx._cleanup?.()
    }
  })
})

describe('studyRoom.get', () => {
  it('rejects users who are not enrolled or members of the room', async () => {
    const ownerCtx = await createTestContext({ authenticated: true })
    const outsiderCtx = await createTestContext({ authenticated: true })

    try {
      const ownerCaller = createCaller(ownerCtx)
      const outsiderCaller = createCaller(outsiderCtx)

      const { data: ownerUser } = await ownerCtx.supabase
        .from('users')
        .select('id')
        .eq('auth_id', ownerCtx.user!.id)
        .single()

      const { data: instructorProfile } = await ownerCtx.supabase
        .from('instructor_profiles')
        .insert({ user_id: ownerUser!.id, institution: 'Test U' })
        .select('id')
        .single()

      const { data: course } = await ownerCtx.supabase
        .from('courses')
        .insert({
          instructor_id: instructorProfile!.id,
          title: 'Private Details Course',
          status: 'active',
        })
        .select('id')
        .single()

      await ownerCtx.supabase.from('course_enrollments').insert({
        course_id: course!.id,
        user_id: ownerUser!.id,
        status: 'active',
      })

      const room = await ownerCaller.studyRoom.create({
        courseId: course!.id as string,
        topic: 'Private details',
      })

      await expect(outsiderCaller.studyRoom.get({ roomId: room.id })).rejects.toThrow(
        expect.objectContaining({ code: 'FORBIDDEN' } satisfies Partial<TRPCError>),
      )
    } finally {
      await outsiderCtx._cleanup?.()
      await ownerCtx._cleanup?.()
    }
  })
})

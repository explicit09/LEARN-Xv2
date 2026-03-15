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
})

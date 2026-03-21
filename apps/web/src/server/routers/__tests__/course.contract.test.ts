/**
 * Contract tests for course router.
 * Requires: Supabase running with Phase 2E migration applied.
 *
 * Run: pnpm --filter web test:contract
 */
import { TRPCError } from '@trpc/server'
import { describe, expect, it } from 'vitest'

import { createCallerFactory } from '../../trpc'
import { appRouter } from '../_app'
import { createTestContext } from './_test-helpers'

const createCaller = createCallerFactory(appRouter)

// ── course.create ─────────────────────────────────────────────────────────────

describe('course.create', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(caller.course.create({ title: 'CS 101' })).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('creates a course and instructor profile if needed', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)

    const course = await caller.course.create({
      title: 'Introduction to AI',
      description: 'An intro course',
    })
    expect(course).toHaveProperty('id')
    expect(course.title).toBe('Introduction to AI')
    expect(course).toHaveProperty('joinCode')

    await ctx._cleanup?.()
  })
})

// ── course.list ───────────────────────────────────────────────────────────────

describe('course.list', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(caller.course.list()).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('returns empty array when user has no courses', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)

    const courses = await caller.course.list()
    expect(Array.isArray(courses)).toBe(true)

    await ctx._cleanup?.()
  })

  it('returns courses after creating one', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)

    await caller.course.create({ title: 'Test Course' })
    const courses = await caller.course.list()
    expect(courses.length).toBeGreaterThan(0)
    expect(courses[0]).toHaveProperty('title')

    await ctx._cleanup?.()
  })
})

// ── course.get ────────────────────────────────────────────────────────────────

describe('course.get', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.course.get({ courseId: '550e8400-e29b-41d4-a716-446655440000' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('throws NOT_FOUND for non-existent course', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)

    await expect(
      caller.course.get({ courseId: '550e8400-e29b-41d4-a716-446655440099' }),
    ).rejects.toThrow(expect.objectContaining({ code: 'NOT_FOUND' } satisfies Partial<TRPCError>))

    await ctx._cleanup?.()
  })
})

// ── course.join ───────────────────────────────────────────────────────────────

describe('course.join', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(caller.course.join({ joinCode: 'ABCD1234' })).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('throws NOT_FOUND for invalid join code', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)

    await expect(caller.course.join({ joinCode: 'INVALID1' })).rejects.toThrow(
      expect.objectContaining({ code: 'NOT_FOUND' } satisfies Partial<TRPCError>),
    )

    await ctx._cleanup?.()
  })
})

// ── course.inviteStudent ──────────────────────────────────────────────────────

describe('course.inviteStudent', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.course.inviteStudent({ courseId: '550e8400-e29b-41d4-a716-446655440000' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })
})

// ── course.getAtRiskStudents ──────────────────────────────────────────────────

describe('course.getAtRiskStudents', () => {
  it('does not flag every newly enrolled student as at-risk by default', async () => {
    const instructorCtx = await createTestContext({ authenticated: true })
    const studentCtx = await createTestContext({ authenticated: true })

    try {
      const instructorCaller = createCaller(instructorCtx)
      const studentCaller = createCaller(studentCtx)

      const course = await instructorCaller.course.create({ title: 'Signals 101' })

      await instructorCtx.supabase.from('courses').update({ status: 'active' }).eq('id', course.id)

      await studentCaller.course.join({ joinCode: course.joinCode })

      const atRisk = await instructorCaller.course.getAtRiskStudents({ courseId: course.id })
      expect(atRisk).toHaveLength(0)
    } finally {
      await studentCtx._cleanup?.()
      await instructorCtx._cleanup?.()
    }
  })
})

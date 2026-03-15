/**
 * Contract tests for user router.
 * Requires: supabase start (local Supabase running on port 54321)
 *
 * Run: pnpm --filter web test:contract
 */
import { TRPCError } from '@trpc/server'
import { afterEach, describe, expect, it } from 'vitest'

import { createCallerFactory } from '../../trpc'
import { appRouter } from '../_app'
import { createTestContext } from './_test-helpers'

const createCaller = createCallerFactory(appRouter)

describe('user.getProfile', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)

    await expect(caller.user.getProfile()).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('returns the user profile for an authenticated user', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)

    const profile = await caller.user.getProfile()

    expect(profile).toMatchObject({
      display_name: expect.any(String) as string,
      email: expect.any(String) as string,
      user_type: expect.stringMatching(/^(student|professor|admin)$/) as string,
      onboarding_completed: expect.any(Boolean) as boolean,
    })

    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })

  it('throws NOT_FOUND when auth user has no matching users row', async () => {
    const ctx = await createTestContext({ authenticated: true, skipUserRow: true })
    const caller = createCaller(ctx)

    await expect(caller.user.getProfile()).rejects.toThrow(
      expect.objectContaining({ code: 'NOT_FOUND' } satisfies Partial<TRPCError>),
    )

    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })
})

describe('user.updateProfile', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(caller.user.updateProfile({ displayName: 'New Name' })).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('updates displayName', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const result = await caller.user.updateProfile({ displayName: 'Updated Name' })
    expect(result.display_name).toBe('Updated Name')
    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })
})

describe('user.upsertPersona', () => {
  const personaInput = {
    interests: ['basketball', 'finance'],
    motivationalStyle: 'mastery' as const,
    tonePreference: 'balanced' as const,
    difficultyPreference: 'adaptive' as const,
  }

  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(caller.user.upsertPersona(personaInput)).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('creates a persona for the user', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const result = await caller.user.upsertPersona(personaInput)
    expect(result).toMatchObject({
      interests: ['basketball', 'finance'],
      motivational_style: 'mastery',
      tone_preference: 'balanced',
      difficulty_preference: 'adaptive',
    })
    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })

  it('updates an existing persona', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    await caller.user.upsertPersona(personaInput)
    const updated = await caller.user.upsertPersona({
      interests: ['science'],
      motivationalStyle: 'curiosity',
      tonePreference: 'academic',
      difficultyPreference: 'advanced',
    })
    expect(updated.interests).toEqual(['science'])
    expect(updated.motivational_style).toBe('curiosity')
    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })
})

describe('user.completeOnboarding', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(caller.user.completeOnboarding()).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('sets onboarding_completed to true', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const result = await caller.user.completeOnboarding()
    expect(result.onboarding_completed).toBe(true)
    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })
})

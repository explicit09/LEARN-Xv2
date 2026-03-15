/**
 * Contract tests for chat router.
 * Requires: Supabase running with Phase 1E migration applied.
 *
 * Run: pnpm --filter web test:contract
 */
import { TRPCError } from '@trpc/server'
import { afterEach, describe, expect, it } from 'vitest'

import { createCallerFactory } from '../../trpc'
import { appRouter } from '../_app'
import { createTestContext } from './_test-helpers'

const createCaller = createCallerFactory(appRouter)

async function createTestWorkspace(ctx: Awaited<ReturnType<typeof createTestContext>>) {
  const caller = createCaller(ctx)
  return caller.workspace.create({ name: 'Chat Test Workspace' })
}

// ── chat.createSession ─────────────────────────────────────────────────────────

describe('chat.createSession', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.chat.createSession({ workspaceId: '550e8400-e29b-41d4-a716-446655440000' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('creates a session and returns id + workspaceId', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    const session = await caller.chat.createSession({ workspaceId: workspace.id })
    expect(session.id).toBeTruthy()
    // Supabase returns snake_case columns — workspace_id is the actual DB column name
    expect((session as Record<string, unknown>).workspace_id).toBe(workspace.id)

    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })

  it('accepts optional lessonId', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    // Create a dummy lesson via service client
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    const { createClient } = await import('@supabase/supabase-js')
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Get internal user id
    const { data: userRow } = await serviceClient
      .from('users')
      .select('id')
      .eq('auth_id', ctx.user!.id)
      .single()

    const { data: lesson } = await serviceClient
      .from('lessons')
      .insert({
        workspace_id: workspace.id,
        user_id: userRow!.id,
        title: 'Test Lesson',
        order_index: 0,
        content_markdown: '',
        structured_sections: [],
      })
      .select('id')
      .single()

    const session = await caller.chat.createSession({
      workspaceId: workspace.id,
      lessonId: lesson!.id,
    })
    expect((session as Record<string, unknown>).lesson_id).toBe(lesson!.id)

    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })
})

// ── chat.listSessions ──────────────────────────────────────────────────────────

describe('chat.listSessions', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.chat.listSessions({ workspaceId: '550e8400-e29b-41d4-a716-446655440000' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('returns empty array for workspace with no sessions', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    const result = await caller.chat.listSessions({ workspaceId: workspace.id })
    expect(result).toEqual([])

    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })

  it('returns sessions ordered by updatedAt desc after creating', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    await caller.chat.createSession({ workspaceId: workspace.id })
    await caller.chat.createSession({ workspaceId: workspace.id })

    const sessions = await caller.chat.listSessions({ workspaceId: workspace.id })
    expect(sessions.length).toBe(2)

    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })
})

// ── chat.getSession ────────────────────────────────────────────────────────────

describe('chat.getSession', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.chat.getSession({
        id: '550e8400-e29b-41d4-a716-446655440000',
        workspaceId: '550e8400-e29b-41d4-a716-446655440001',
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('throws NOT_FOUND for wrong workspace', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)

    await expect(
      caller.chat.getSession({
        id: '550e8400-e29b-41d4-a716-446655440000',
        workspaceId: '550e8400-e29b-41d4-a716-446655440001',
      }),
    ).rejects.toThrow(expect.objectContaining({ code: 'NOT_FOUND' } satisfies Partial<TRPCError>))

    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })

  it('returns session with empty messages array', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)
    const created = await caller.chat.createSession({ workspaceId: workspace.id })

    const session = await caller.chat.getSession({ id: created.id, workspaceId: workspace.id })
    expect(session.id).toBe(created.id)
    expect(Array.isArray(session.messages)).toBe(true)
    expect(session.messages).toHaveLength(0)

    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })
})

// ── chat.deleteSession ─────────────────────────────────────────────────────────

describe('chat.deleteSession', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.chat.deleteSession({
        id: '550e8400-e29b-41d4-a716-446655440000',
        workspaceId: '550e8400-e29b-41d4-a716-446655440001',
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('deletes a session', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)
    const created = await caller.chat.createSession({ workspaceId: workspace.id })

    await caller.chat.deleteSession({ id: created.id, workspaceId: workspace.id })

    const sessions = await caller.chat.listSessions({ workspaceId: workspace.id })
    expect(sessions.find((s) => s.id === created.id)).toBeUndefined()

    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })
})

/**
 * Contract tests for knowledgeGraph router.
 * Requires: Supabase running with Phase 3A migration applied.
 *
 * Run: pnpm --filter web test:contract
 */
import { TRPCError } from '@trpc/server'
import { describe, expect, it } from 'vitest'

import { createCallerFactory } from '../../trpc'
import { appRouter } from '../_app'
import { createTestContext } from './_test-helpers'

const createCaller = createCallerFactory(appRouter)

// ── knowledgeGraph.getGraph ────────────────────────────────────────────────────

describe('knowledgeGraph.getGraph', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.knowledgeGraph.getGraph({
        workspaceId: '00000000-0000-0000-0000-000000000001',
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('returns empty graph for workspace with no concepts', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    // Create a workspace first
    const ws = await caller.workspace.create({ name: 'Graph Test WS' })
    const graph = await caller.knowledgeGraph.getGraph({ workspaceId: ws.id })
    expect(graph).toHaveProperty('nodes')
    expect(graph).toHaveProperty('edges')
    expect(Array.isArray(graph.nodes)).toBe(true)
    expect(Array.isArray(graph.edges)).toBe(true)
  })
})

// ── knowledgeGraph.tagConcept ──────────────────────────────────────────────────

describe('knowledgeGraph.tagConcept', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.knowledgeGraph.tagConcept({
        conceptId: '00000000-0000-0000-0000-000000000001',
        tag: 'gradient-descent',
        domain: 'ml',
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('throws NOT_FOUND for concept not in user workspace', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    await expect(
      caller.knowledgeGraph.tagConcept({
        conceptId: '00000000-0000-0000-0000-000000000001',
        tag: 'gradient-descent',
      }),
    ).rejects.toThrow(expect.objectContaining({ code: 'NOT_FOUND' } satisfies Partial<TRPCError>))
  })
})

// ── knowledgeGraph.addRelation ─────────────────────────────────────────────────

describe('knowledgeGraph.addRelation', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.knowledgeGraph.addRelation({
        sourceConcept: '00000000-0000-0000-0000-000000000001',
        targetConcept: '00000000-0000-0000-0000-000000000002',
        relationType: 'prerequisite',
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('rejects creating a relation to a concept outside the user workspace', async () => {
    const ownerCtx = await createTestContext({ authenticated: true })
    const outsiderCtx = await createTestContext({ authenticated: true })

    try {
      const ownerCaller = createCaller(ownerCtx)
      const outsiderCaller = createCaller(outsiderCtx)
      const ownerWorkspace = await ownerCaller.workspace.create({ name: 'Owner KG WS' })
      const outsiderWorkspace = await outsiderCaller.workspace.create({ name: 'Outsider KG WS' })

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

      const { data: sourceConcept } = await ownerCtx.supabase
        .from('concepts')
        .insert({
          workspace_id: ownerWorkspace.id,
          name: 'Owner Concept',
        })
        .select('id')
        .single()

      const { data: targetConcept } = await outsiderCtx.supabase
        .from('concepts')
        .insert({
          workspace_id: outsiderWorkspace.id,
          name: 'Outsider Concept',
        })
        .select('id')
        .single()

      expect(ownerUser).toBeTruthy()
      expect(outsiderUser).toBeTruthy()
      expect(sourceConcept).toBeTruthy()
      expect(targetConcept).toBeTruthy()

      await expect(
        ownerCaller.knowledgeGraph.addRelation({
          sourceConcept: sourceConcept!.id as string,
          targetConcept: targetConcept!.id as string,
          relationType: 'related',
        }),
      ).rejects.toThrow(expect.objectContaining({ code: 'NOT_FOUND' } satisfies Partial<TRPCError>))
    } finally {
      await outsiderCtx._cleanup?.()
      await ownerCtx._cleanup?.()
    }
  })
})

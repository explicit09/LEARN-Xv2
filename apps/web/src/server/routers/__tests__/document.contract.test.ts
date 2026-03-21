/**
 * Contract tests for document router.
 * Requires: Supabase running with Phase 1B migration applied.
 *
 * Run: pnpm --filter web test:contract
 */
import { TRPCError } from '@trpc/server'
import { afterEach, describe, expect, it } from 'vitest'

import { createCallerFactory } from '../../trpc'
import { appRouter } from '../_app'
import { createTestContext } from './_test-helpers'

const createCaller = createCallerFactory(appRouter)

// Helper: create a workspace for a test user
async function createTestWorkspace(ctx: Awaited<ReturnType<typeof createTestContext>>) {
  const caller = createCaller(ctx)
  return caller.workspace.create({ name: 'Test Workspace' })
}

describe('document.initiateUpload', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.document.initiateUpload({
        workspaceId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Test PDF',
        fileType: 'pdf',
        fileSizeBytes: 1024,
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('creates a document row and returns a signed upload URL', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    const result = await caller.document.initiateUpload({
      workspaceId: workspace.id,
      title: 'Machine Learning Notes',
      fileType: 'pdf',
      fileSizeBytes: 2 * 1024 * 1024,
    })

    expect(result.documentId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
    expect(result.signedUploadUrl).toContain('documents')
    expect(result.storagePath).toBeTruthy()

    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })

  it('throws NOT_FOUND for a workspace the user does not own', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)

    await expect(
      caller.document.initiateUpload({
        workspaceId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Test',
        fileType: 'pdf',
        fileSizeBytes: 1024,
      }),
    ).rejects.toThrow(expect.objectContaining({ code: 'NOT_FOUND' } satisfies Partial<TRPCError>))

    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })
})

describe('document.confirmUpload', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.document.confirmUpload({ documentId: '550e8400-e29b-41d4-a716-446655440000' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('updates document to processing and creates a job row', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    const { documentId } = await caller.document.initiateUpload({
      workspaceId: workspace.id,
      title: 'Notes',
      fileType: 'pdf',
      fileSizeBytes: 1024,
    })

    const result = await caller.document.confirmUpload({ documentId })

    expect(result.document.id).toBe(documentId)
    expect(result.document.status).toBe('processing')
    expect(result.jobId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)

    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })
})

describe('document.list', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.document.list({ workspaceId: '550e8400-e29b-41d4-a716-446655440000' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('returns documents for workspace ordered by created_at DESC', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    await caller.document.initiateUpload({
      workspaceId: workspace.id,
      title: 'Doc A',
      fileType: 'pdf',
      fileSizeBytes: 1024,
    })
    await caller.document.initiateUpload({
      workspaceId: workspace.id,
      title: 'Doc B',
      fileType: 'txt',
      fileSizeBytes: 512,
    })

    const docs = await caller.document.list({ workspaceId: workspace.id })
    expect(docs.length).toBe(2)
    expect(docs[0].title).toBe('Doc B') // most recent first
    expect(docs[1].title).toBe('Doc A')

    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })
})

describe('document.get', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.document.get({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('returns a document with its latest job', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    const { documentId } = await caller.document.initiateUpload({
      workspaceId: workspace.id,
      title: 'My Doc',
      fileType: 'pdf',
      fileSizeBytes: 1024,
    })
    await caller.document.confirmUpload({ documentId })

    const result = await caller.document.get({ id: documentId })
    expect(result.id).toBe(documentId)
    expect(result.title).toBe('My Doc')
    expect(result.job).toBeDefined()
    expect(result.job?.status).toBe('pending')

    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })

  it('throws NOT_FOUND for a document that does not belong to user', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    await expect(
      caller.document.get({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    ).rejects.toThrow(expect.objectContaining({ code: 'NOT_FOUND' } satisfies Partial<TRPCError>))
    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })
})

describe('document.retryProcessing', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.document.retryProcessing({ documentId: '550e8400-e29b-41d4-a716-446655440000' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('throws NOT_FOUND for nonexistent document', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    await expect(
      caller.document.retryProcessing({ documentId: '550e8400-e29b-41d4-a716-446655440000' }),
    ).rejects.toThrow(expect.objectContaining({ code: 'NOT_FOUND' } satisfies Partial<TRPCError>))
    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })

  it('throws BAD_REQUEST for non-failed document', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    const { documentId } = await caller.document.initiateUpload({
      workspaceId: workspace.id,
      title: 'Not Failed',
      fileType: 'pdf',
      fileSizeBytes: 1024,
    })

    await expect(caller.document.retryProcessing({ documentId })).rejects.toThrow(
      expect.objectContaining({ code: 'BAD_REQUEST' } satisfies Partial<TRPCError>),
    )

    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })

  it('retries a failed document and creates a new job', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    const { documentId } = await caller.document.initiateUpload({
      workspaceId: workspace.id,
      title: 'Failed Doc',
      fileType: 'pdf',
      fileSizeBytes: 1024,
    })

    // Manually set status to failed via supabase
    await ctx.supabase.from('documents').update({ status: 'failed' }).eq('id', documentId)

    const result = await caller.document.retryProcessing({ documentId })
    expect(result.jobId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)

    // Document should be back to processing
    const doc = await caller.document.get({ id: documentId })
    expect(doc.status).toBe('processing')

    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })
})

describe('document.ingestUrl', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.document.ingestUrl({
        workspaceId: '550e8400-e29b-41d4-a716-446655440000',
        url: 'https://example.com/notes.html',
      }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('creates a document and job for a URL', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    const result = await caller.document.ingestUrl({
      workspaceId: workspace.id,
      url: 'https://example.com/lecture-notes.html',
    })

    expect(result.documentId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
    expect(result.jobId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)

    const doc = await caller.document.get({ id: result.documentId })
    expect(doc.status).toBe('processing')
    expect(doc.file_url).toBe('https://example.com/lecture-notes.html')

    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })

  it('detects YouTube URLs', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    const result = await caller.document.ingestUrl({
      workspaceId: workspace.id,
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    })

    const doc = await caller.document.get({ id: result.documentId })
    expect(doc.title).toBe('YouTube Video')
    expect((doc.metadata as { is_youtube?: boolean })?.is_youtube).toBe(true)

    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })

  it('throws NOT_FOUND for workspace user does not own', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    await expect(
      caller.document.ingestUrl({
        workspaceId: '550e8400-e29b-41d4-a716-446655440000',
        url: 'https://example.com/notes.html',
      }),
    ).rejects.toThrow(expect.objectContaining({ code: 'NOT_FOUND' } satisfies Partial<TRPCError>))
    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })
})

describe('document.delete', () => {
  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = await createTestContext({ authenticated: false })
    const caller = createCaller(ctx)
    await expect(
      caller.document.delete({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHORIZED' } satisfies Partial<TRPCError>),
    )
  })

  it('deletes a document', async () => {
    const ctx = await createTestContext({ authenticated: true })
    const caller = createCaller(ctx)
    const workspace = await createTestWorkspace(ctx)

    const { documentId } = await caller.document.initiateUpload({
      workspaceId: workspace.id,
      title: 'To Delete',
      fileType: 'pdf',
      fileSizeBytes: 1024,
    })

    const result = await caller.document.delete({ id: documentId })
    expect(result.success).toBe(true)

    await expect(caller.document.get({ id: documentId })).rejects.toThrow(
      expect.objectContaining({ code: 'NOT_FOUND' } satisfies Partial<TRPCError>),
    )

    await (ctx as { _cleanup?: () => Promise<void> })._cleanup?.()
  })
})

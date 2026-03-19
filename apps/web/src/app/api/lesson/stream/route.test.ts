import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCreateClient = vi.fn()
const mockBuildLessonPrompt = vi.fn(() => 'prompt')
const mockAnthropic = vi.fn(() => 'model')
const mockStreamText = vi.fn(() => ({
  toTextStreamResponse: () => new Response('ok', { status: 200 }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

vi.mock('@/lib/ai', () => ({
  anthropic: mockAnthropic,
  MODEL_ROUTES: { LESSON_GENERATION: 'test-model' },
}))

vi.mock('@/lib/ai/prompts/lesson-generation.v1', () => ({
  buildLessonPrompt: mockBuildLessonPrompt,
}))

vi.mock('ai', () => ({
  streamText: mockStreamText,
  Output: {
    object: ({ schema }: { schema: unknown }) => ({ schema }),
  },
}))

describe('lesson stream route', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('returns 403 when the workspace does not belong to the authenticated user', async () => {
    const single = vi
      .fn()
      .mockResolvedValueOnce({ data: { id: 'user-row-1' } })
      .mockResolvedValueOnce({ data: null })
    const eqResult: { eq: ReturnType<typeof vi.fn>; single: typeof single } = {
      eq: vi.fn(),
      single,
    }
    eqResult.eq.mockReturnValue(eqResult)
    const select = vi.fn().mockReturnValue({ eq: eqResult.eq })

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'auth-user-1' } },
        }),
      },
      from: vi.fn().mockImplementation(() => ({ select })),
    })

    const { POST } = await import('./route')

    const response = await POST(
      new Request('http://localhost/api/lesson/stream', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          conceptName: 'Binary Trees',
          workspaceId: '550e8400-e29b-41d4-a716-446655440000',
          prerequisites: [],
          retrievedChunks: [],
        }),
      }) as never,
    )

    expect(response.status).toBe(403)
    expect(mockStreamText).not.toHaveBeenCalled()
  })
})

import { describe, expect, it } from 'vitest'
import {
  createChatSessionSchema,
  deleteChatSessionSchema,
  getChatSessionSchema,
  listChatSessionsSchema,
  sendMessageSchema,
} from '../chat'

describe('createChatSessionSchema', () => {
  it('accepts valid workspaceId', () => {
    const result = createChatSessionSchema.safeParse({
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })

  it('accepts optional lessonId', () => {
    const result = createChatSessionSchema.safeParse({
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      lessonId: '550e8400-e29b-41d4-a716-446655440001',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.lessonId).toBe('550e8400-e29b-41d4-a716-446655440001')
  })

  it('rejects invalid workspaceId', () => {
    const result = createChatSessionSchema.safeParse({ workspaceId: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid lessonId', () => {
    const result = createChatSessionSchema.safeParse({
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      lessonId: 'bad',
    })
    expect(result.success).toBe(false)
  })
})

describe('listChatSessionsSchema', () => {
  it('accepts valid workspaceId', () => {
    const result = listChatSessionsSchema.safeParse({
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing workspaceId', () => {
    const result = listChatSessionsSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('getChatSessionSchema', () => {
  it('accepts valid id + workspaceId', () => {
    const result = getChatSessionSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      workspaceId: '550e8400-e29b-41d4-a716-446655440001',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid id', () => {
    const result = getChatSessionSchema.safeParse({
      id: 'bad',
      workspaceId: '550e8400-e29b-41d4-a716-446655440001',
    })
    expect(result.success).toBe(false)
  })
})

describe('deleteChatSessionSchema', () => {
  it('accepts valid id + workspaceId', () => {
    const result = deleteChatSessionSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      workspaceId: '550e8400-e29b-41d4-a716-446655440001',
    })
    expect(result.success).toBe(true)
  })
})

describe('sendMessageSchema', () => {
  it('accepts valid sessionId + content', () => {
    const result = sendMessageSchema.safeParse({
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      content: 'Hello',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty content', () => {
    const result = sendMessageSchema.safeParse({
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      content: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid sessionId', () => {
    const result = sendMessageSchema.safeParse({
      sessionId: 'not-a-uuid',
      content: 'Hello',
    })
    expect(result.success).toBe(false)
  })
})

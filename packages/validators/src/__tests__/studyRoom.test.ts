import { describe, it, expect } from 'vitest'
import {
  createRoomSchema,
  joinRoomSchema,
  sendRoomMessageSchema,
  listRoomsSchema,
} from '../studyRoom'

describe('createRoomSchema', () => {
  it('accepts courseId only', () => {
    const result = createRoomSchema.safeParse({
      courseId: '00000000-0000-0000-0000-000000000001',
    })
    expect(result.success).toBe(true)
  })

  it('accepts courseId with optional topic', () => {
    const result = createRoomSchema.safeParse({
      courseId: '00000000-0000-0000-0000-000000000001',
      topic: 'Midterm review',
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-uuid courseId', () => {
    const result = createRoomSchema.safeParse({ courseId: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('rejects empty topic', () => {
    const result = createRoomSchema.safeParse({
      courseId: '00000000-0000-0000-0000-000000000001',
      topic: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('joinRoomSchema', () => {
  it('accepts valid roomId', () => {
    const result = joinRoomSchema.safeParse({
      roomId: '00000000-0000-0000-0000-000000000001',
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-uuid roomId', () => {
    const result = joinRoomSchema.safeParse({ roomId: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })
})

describe('sendRoomMessageSchema', () => {
  it('accepts valid message', () => {
    const result = sendRoomMessageSchema.safeParse({
      roomId: '00000000-0000-0000-0000-000000000001',
      content: 'Hello study partners!',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty content', () => {
    const result = sendRoomMessageSchema.safeParse({
      roomId: '00000000-0000-0000-0000-000000000001',
      content: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects content over 2000 chars', () => {
    const result = sendRoomMessageSchema.safeParse({
      roomId: '00000000-0000-0000-0000-000000000001',
      content: 'a'.repeat(2001),
    })
    expect(result.success).toBe(false)
  })
})

describe('listRoomsSchema', () => {
  it('accepts courseId', () => {
    const result = listRoomsSchema.safeParse({
      courseId: '00000000-0000-0000-0000-000000000001',
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-uuid courseId', () => {
    const result = listRoomsSchema.safeParse({ courseId: 'bad' })
    expect(result.success).toBe(false)
  })
})

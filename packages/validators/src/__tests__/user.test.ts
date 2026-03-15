import { describe, expect, it } from 'vitest'

import { createUserSchema, updatePersonaSchema, userSchema } from '../user'

const validUser = {
  id: '00000000-0000-0000-0000-000000000001',
  authId: '00000000-0000-0000-0000-000000000002',
  displayName: 'Alice',
  email: 'alice@example.com',
  userType: 'student' as const,
  isAdmin: false,
  onboardingCompleted: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

describe('userSchema', () => {
  it('parses a valid user', () => {
    expect(userSchema.safeParse(validUser).success).toBe(true)
  })

  it('accepts optional avatarUrl', () => {
    const result = userSchema.safeParse({ ...validUser, avatarUrl: 'https://example.com/a.png' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    expect(userSchema.safeParse({ ...validUser, email: 'not-an-email' }).success).toBe(false)
  })

  it('rejects userType outside enum', () => {
    expect(userSchema.safeParse({ ...validUser, userType: 'hacker' }).success).toBe(false)
  })

  it('accepts all valid userType values', () => {
    for (const t of ['student', 'professor', 'admin']) {
      expect(userSchema.safeParse({ ...validUser, userType: t }).success).toBe(true)
    }
  })

  it('rejects non-uuid id', () => {
    expect(userSchema.safeParse({ ...validUser, id: 'not-a-uuid' }).success).toBe(false)
  })

  it('rejects empty displayName', () => {
    expect(userSchema.safeParse({ ...validUser, displayName: '' }).success).toBe(false)
  })

  it('rejects displayName over 200 chars', () => {
    expect(userSchema.safeParse({ ...validUser, displayName: 'a'.repeat(201) }).success).toBe(
      false,
    )
  })
})

describe('createUserSchema', () => {
  it('only requires displayName and email', () => {
    const result = createUserSchema.safeParse({
      displayName: 'Alice',
      email: 'alice@example.com',
    })
    expect(result.success).toBe(true)
  })

  it('defaults userType to student', () => {
    const result = createUserSchema.safeParse({
      displayName: 'Alice',
      email: 'alice@example.com',
    })
    if (!result.success) throw new Error('parse failed')
    expect(result.data.userType).toBe('student')
  })

  it('defaults isAdmin to false', () => {
    const result = createUserSchema.safeParse({
      displayName: 'Alice',
      email: 'alice@example.com',
    })
    if (!result.success) throw new Error('parse failed')
    expect(result.data.isAdmin).toBe(false)
  })

  it('rejects invalid email', () => {
    expect(createUserSchema.safeParse({ displayName: 'Alice', email: 'bad' }).success).toBe(false)
  })
})

describe('updatePersonaSchema', () => {
  it('accepts partial updates', () => {
    expect(updatePersonaSchema.safeParse({ interests: ['basketball', 'finance'] }).success).toBe(
      true,
    )
  })

  it('accepts empty object (no-op update)', () => {
    expect(updatePersonaSchema.safeParse({}).success).toBe(true)
  })

  it('rejects invalid motivationalStyle', () => {
    expect(
      updatePersonaSchema.safeParse({ motivationalStyle: 'greed' as string }).success,
    ).toBe(false)
  })

  it('rejects invalid tonePreference', () => {
    expect(updatePersonaSchema.safeParse({ tonePreference: 'rude' as string }).success).toBe(false)
  })

  it('rejects invalid difficultyPreference', () => {
    expect(
      updatePersonaSchema.safeParse({ difficultyPreference: 'expert' as string }).success,
    ).toBe(false)
  })
})

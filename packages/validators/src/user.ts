import { z } from 'zod'

export const userSchema = z.object({
  id: z.string().uuid(),
  authId: z.string().uuid(),
  displayName: z.string().min(1).max(200),
  email: z.string().email(),
  avatarUrl: z.string().url().optional(),
  userType: z.enum(['student', 'professor', 'admin']).default('student'),
  isAdmin: z.boolean().default(false),
  onboardingCompleted: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const createUserSchema = z.object({
  displayName: z.string().min(1).max(200),
  email: z.string().email(),
  avatarUrl: z.string().url().optional(),
  userType: z.enum(['student', 'professor', 'admin']).default('student'),
  isAdmin: z.boolean().default(false),
})

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  avatarUrl: z.string().url().optional(),
})

export const updatePersonaSchema = z.object({
  interests: z.array(z.string()).optional(),
  aspirationTags: z.array(z.string()).optional(),
  affinityDomains: z.array(z.string()).optional(),
  motivationalStyle: z
    .enum(['challenge', 'progress', 'mastery', 'curiosity'])
    .optional(),
  tonePreference: z.enum(['casual', 'balanced', 'academic', 'socratic']).optional(),
  difficultyPreference: z
    .enum(['beginner', 'intermediate', 'advanced', 'adaptive'])
    .optional(),
  explanationPreferences: z.record(z.unknown()).optional(),
})

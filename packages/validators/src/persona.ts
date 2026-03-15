import { z } from 'zod'

export const upsertPersonaSchema = z.object({
  interests: z.array(z.string()),
  motivationalStyle: z.enum(['challenge', 'progress', 'mastery', 'curiosity']),
  tonePreference: z.enum(['casual', 'balanced', 'academic', 'socratic']),
  difficultyPreference: z.enum(['beginner', 'intermediate', 'advanced', 'adaptive']),
  aspirationTags: z.array(z.string()).optional(),
  affinityDomains: z.array(z.string()).optional(),
})

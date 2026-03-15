import type { z } from 'zod'

import type {
  createUserSchema,
  createWorkspaceSchema,
  jobSchema,
  jobStatusEnum,
  updatePersonaSchema,
  updateProfileSchema,
  updateWorkspaceSchema,
  upsertPersonaSchema,
  userSchema,
  workspaceSchema,
} from '@learn-x/validators'

export type User = z.infer<typeof userSchema>
export type CreateUser = z.infer<typeof createUserSchema>
export type UpdatePersona = z.infer<typeof updatePersonaSchema>
export type UpdateProfile = z.infer<typeof updateProfileSchema>
export type UpsertPersona = z.infer<typeof upsertPersonaSchema>

export type Workspace = z.infer<typeof workspaceSchema>
export type CreateWorkspace = z.infer<typeof createWorkspaceSchema>
export type UpdateWorkspace = z.infer<typeof updateWorkspaceSchema>

export type Job = z.infer<typeof jobSchema>
export type JobStatus = z.infer<typeof jobStatusEnum>

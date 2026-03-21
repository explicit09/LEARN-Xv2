import { z } from 'zod'

export const documentStatusEnum = z.enum(['uploading', 'processing', 'ready', 'failed'])
export type DocumentStatus = z.infer<typeof documentStatusEnum>

export const documentFileTypeEnum = z.enum(['pdf', 'docx', 'pptx', 'txt', 'md', 'html'])
export type DocumentFileType = z.infer<typeof documentFileTypeEnum>

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB

export const documentRoleEnum = z.enum(['primary', 'supplementary', 'reference'])
export type DocumentRole = z.infer<typeof documentRoleEnum>

export const documentSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1).max(500),
  fileType: documentFileTypeEnum,
  fileUrl: z.string(),
  status: documentStatusEnum,
  role: documentRoleEnum,
  roleConfidence: z.number().min(0).max(1).nullable(),
  uploadBatchId: z.string().uuid().nullable(),
  pageCount: z.number().int().nonnegative().nullable(),
  tokenCount: z.number().int().nonnegative(),
  metadata: z.record(z.unknown()),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const initiateUploadSchema = z.object({
  workspaceId: z.string().uuid(),
  title: z.string().min(1).max(500),
  fileType: documentFileTypeEnum,
  fileSizeBytes: z
    .number()
    .int()
    .positive()
    .max(MAX_FILE_SIZE_BYTES, { message: `File size must be ≤ 50MB` }),
  uploadBatchId: z.string().uuid().optional(),
})

export const confirmUploadSchema = z.object({
  documentId: z.string().uuid(),
})

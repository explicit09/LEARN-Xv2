import { z } from 'zod'

export const createChatSessionSchema = z.object({
  workspaceId: z.string().uuid(),
  lessonId: z.string().uuid().optional(),
})

export const listChatSessionsSchema = z.object({
  workspaceId: z.string().uuid(),
})

export const getChatSessionSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
})

export const deleteChatSessionSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
})

export const sendMessageSchema = z.object({
  sessionId: z.string().uuid(),
  content: z.string().min(1),
})

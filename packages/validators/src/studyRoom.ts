import { z } from 'zod'

export const createRoomSchema = z.object({
  courseId: z.string().uuid(),
  topic: z.string().min(1).optional(),
})

export const joinRoomSchema = z.object({
  roomId: z.string().uuid(),
})

export const sendRoomMessageSchema = z.object({
  roomId: z.string().uuid(),
  content: z.string().min(1).max(2000),
})

export const listRoomsSchema = z.object({
  courseId: z.string().uuid(),
})

export type CreateRoomInput = z.infer<typeof createRoomSchema>
export type JoinRoomInput = z.infer<typeof joinRoomSchema>
export type SendRoomMessageInput = z.infer<typeof sendRoomMessageSchema>
export type ListRoomsInput = z.infer<typeof listRoomsSchema>

import { createTRPCRouter } from '../trpc'
import { conceptRouter } from './concept'
import { documentRouter } from './document'
import { syllabusRouter } from './syllabus'
import { userRouter } from './user'
import { workspaceRouter } from './workspace'

export const appRouter = createTRPCRouter({
  user: userRouter,
  workspace: workspaceRouter,
  document: documentRouter,
  concept: conceptRouter,
  syllabus: syllabusRouter,
})

export type AppRouter = typeof appRouter

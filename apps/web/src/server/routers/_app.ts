import { createTRPCRouter } from '../trpc'
import { chatRouter } from './chat'
import { conceptRouter } from './concept'
import { documentRouter } from './document'
import { flashcardRouter } from './flashcard'
import { lessonRouter } from './lesson'
import { masteryRouter } from './mastery'
import { quizRouter } from './quiz'
import { syllabusRouter } from './syllabus'
import { userRouter } from './user'
import { workspaceRouter } from './workspace'

export const appRouter = createTRPCRouter({
  user: userRouter,
  workspace: workspaceRouter,
  document: documentRouter,
  concept: conceptRouter,
  syllabus: syllabusRouter,
  lesson: lessonRouter,
  chat: chatRouter,
  quiz: quizRouter,
  flashcard: flashcardRouter,
  mastery: masteryRouter,
})

export type AppRouter = typeof appRouter

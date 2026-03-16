import { createTRPCRouter } from '../trpc'
import { audioRecapRouter } from './audioRecap'
import { chatRouter } from './chat'
import { courseRouter } from './course'
import { knowledgeGraphRouter } from './knowledgeGraph'
import { studyRoomRouter } from './studyRoom'
import { adminRouter } from './admin'
import { notificationRouter } from './notification'
import { studyPlanRouter } from './studyPlan'
import { conceptRouter } from './concept'
import { documentRouter } from './document'
import { examRouter } from './exam'
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
  exam: examRouter,
  audioRecap: audioRecapRouter,
  studyPlan: studyPlanRouter,
  notification: notificationRouter,
  course: courseRouter,
  knowledgeGraph: knowledgeGraphRouter,
  studyRoom: studyRoomRouter,
  admin: adminRouter,
})

export type AppRouter = typeof appRouter

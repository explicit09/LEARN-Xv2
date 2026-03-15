import { QuizRunner } from '@/components/quiz/QuizRunner'

interface Props {
  params: Promise<{ id: string; quizId: string }>
}

export default async function QuizPage({ params }: Props) {
  const { id, quizId } = await params
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <QuizRunner quizId={quizId} workspaceId={id} />
    </div>
  )
}

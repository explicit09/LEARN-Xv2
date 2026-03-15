import { QuizList } from '@/components/quiz/QuizList'

interface Props {
  params: Promise<{ id: string }>
}

export default async function QuizIndexPage({ params }: Props) {
  const { id } = await params
  return (
    <div className="p-6">
      <h1 className="mb-4 text-lg font-semibold text-gray-900">Quizzes</h1>
      <QuizList workspaceId={id} />
    </div>
  )
}

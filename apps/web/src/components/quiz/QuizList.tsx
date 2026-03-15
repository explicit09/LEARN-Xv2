'use client'

import Link from 'next/link'
import { trpc } from '@/lib/trpc/client'

interface QuizListProps {
  workspaceId: string
}

export function QuizList({ workspaceId }: QuizListProps) {
  const { data: quizzes, isLoading } = trpc.quiz.list.useQuery({ workspaceId })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    )
  }

  if (!quizzes?.length) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p className="text-sm">No quizzes yet.</p>
        <p className="mt-1 text-xs text-gray-400">
          Quizzes are generated automatically after document processing.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {quizzes.map((quiz) => (
        <Link
          key={quiz.id}
          href={`/workspace/${workspaceId}/quiz/${quiz.id}`}
          className="block rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">{quiz.title ?? 'Untitled Quiz'}</p>
              <p className="mt-0.5 text-xs text-gray-500 capitalize">
                {(quiz.quiz_type as string)?.replace('_', ' ')}
              </p>
            </div>
            <span className="text-xs text-gray-400">
              {new Date(quiz.created_at as string).toLocaleDateString()}
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}

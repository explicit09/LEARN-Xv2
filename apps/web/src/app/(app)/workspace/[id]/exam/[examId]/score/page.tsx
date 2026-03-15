'use client'

import { use } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface ScorePageProps {
  params: Promise<{ id: string; examId: string }>
}

function getLetterGrade(score: number): { grade: string; color: string } {
  if (score >= 0.9) return { grade: 'A', color: 'text-green-600 dark:text-green-400' }
  if (score >= 0.8) return { grade: 'B', color: 'text-blue-600 dark:text-blue-400' }
  if (score >= 0.7) return { grade: 'C', color: 'text-yellow-600 dark:text-yellow-400' }
  if (score >= 0.6) return { grade: 'D', color: 'text-orange-600 dark:text-orange-400' }
  return { grade: 'F', color: 'text-red-600 dark:text-red-400' }
}

export default function ExamScorePage({ params }: ScorePageProps) {
  const { id, examId } = use(params)
  const searchParams = useSearchParams()

  // Score data is passed via query params from the complete mutation response
  const scoreStr = searchParams.get('score')
  const totalStr = searchParams.get('total')
  const correctStr = searchParams.get('correct')

  const score = scoreStr ? parseFloat(scoreStr) : null
  const total = totalStr ? parseInt(totalStr) : null
  const correct = correctStr ? parseInt(correctStr) : null

  const { grade, color } =
    score != null ? getLetterGrade(score) : { grade: '—', color: 'text-muted-foreground' }

  return (
    <div className="flex-1 p-6">
      <div className="mx-auto max-w-xl space-y-8">
        {/* Score display */}
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Exam Complete</h1>
          <div className="inline-flex flex-col items-center rounded-2xl border bg-card px-12 py-8 shadow-sm">
            <span
              className={['text-7xl font-black', color].join(' ')}
              aria-label={`Grade: ${grade}`}
            >
              {grade}
            </span>
            {score != null && (
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {Math.round(score * 100)}%
              </p>
            )}
            {correct != null && total != null && (
              <p className="text-sm text-muted-foreground">
                {correct} of {total} correct
              </p>
            )}
          </div>
        </div>

        {/* Feedback message */}
        {score != null && (
          <div
            className={[
              'rounded-lg border px-4 py-3 text-sm',
              score >= 0.8
                ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300'
                : score >= 0.6
                  ? 'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300'
                  : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300',
            ].join(' ')}
          >
            {score >= 0.8
              ? 'Great work! You demonstrated strong mastery of this material.'
              : score >= 0.6
                ? 'Good effort. Review the concepts you missed and try again.'
                : 'Keep studying. Focus on the key concepts and retake the exam when ready.'}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/workspace/${id}/exam/${examId}`}
            className="flex-1 rounded-md border px-4 py-2.5 text-center text-sm font-medium hover:bg-accent transition-colors"
          >
            Retake Exam
          </Link>
          <Link
            href={`/workspace/${id}?tab=exam`}
            className="flex-1 rounded-md bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-opacity"
          >
            Back to Workspace
          </Link>
        </div>

        {/* Study recommendations */}
        {score != null && score < 0.8 && (
          <div className="rounded-lg border bg-card p-4 space-y-2">
            <h2 className="text-sm font-semibold">What to do next</h2>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Review lessons for concepts you struggled with</li>
              <li>• Use flashcards to reinforce key terms</li>
              <li>• Ask questions in the AI Chat for deeper explanations</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

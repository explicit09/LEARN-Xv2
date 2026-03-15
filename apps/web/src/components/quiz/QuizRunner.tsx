'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'

interface QuizRunnerProps {
  quizId: string
  workspaceId: string
}

type Step = 'loading' | 'ready' | 'answering' | 'result' | 'done'

export function QuizRunner({ quizId, workspaceId }: QuizRunnerProps) {
  const { data: quiz, isLoading } = trpc.quiz.get.useQuery({ id: quizId, workspaceId })
  const startAttempt = trpc.quiz.startAttempt.useMutation()
  const submitResponse = trpc.quiz.submitResponse.useMutation()
  const completeAttempt = trpc.quiz.completeAttempt.useMutation()

  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [lastResult, setLastResult] = useState<{ isCorrect: boolean | null } | null>(null)
  const [step, setStep] = useState<Step>('ready')
  const [finalScore, setFinalScore] = useState<number | null>(null)

  if (isLoading || !quiz) {
    return <div className="h-48 animate-pulse rounded-lg bg-gray-100" />
  }

  const questions = quiz.questions as Array<{
    id: string
    question: string
    question_type: string
    options: string[] | null
    correct_answer: string
  }>

  async function handleStart() {
    const attempt = await startAttempt.mutateAsync({ quizId, workspaceId })
    setAttemptId(attempt.id)
    setCurrentIndex(0)
    setStep('answering')
  }

  async function handleSubmit() {
    if (!attemptId) return
    const q = questions[currentIndex]
    if (!q) return
    const result = await submitResponse.mutateAsync({
      attemptId,
      questionId: q.id,
      userAnswer,
    })
    setLastResult({ isCorrect: result.is_correct })
    setStep('result')
  }

  async function handleNext() {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1)
      setUserAnswer('')
      setLastResult(null)
      setStep('answering')
    } else {
      if (!attemptId) return
      const completed = await completeAttempt.mutateAsync({ attemptId, workspaceId })
      setFinalScore(completed.score)
      setStep('done')
    }
  }

  if (step === 'ready') {
    return (
      <div className="rounded-lg border border-gray-200 p-6 text-center">
        <h2 className="text-lg font-semibold text-gray-900">{quiz.title ?? 'Quiz'}</h2>
        <p className="mt-2 text-sm text-gray-500">{questions.length} questions</p>
        <button
          onClick={handleStart}
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Start Quiz
        </button>
      </div>
    )
  }

  if (step === 'done') {
    const pct = Math.round((finalScore ?? 0) * 100)
    return (
      <div className="rounded-lg border border-gray-200 p-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900">{pct}%</h2>
        <p className="mt-2 text-sm text-gray-500">Quiz complete</p>
        <button
          onClick={() => setStep('ready')}
          className="mt-4 rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
        >
          Retake
        </button>
      </div>
    )
  }

  const q = questions[currentIndex]
  if (!q) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          Question {currentIndex + 1} of {questions.length}
        </span>
      </div>

      <div className="rounded-lg border border-gray-200 p-5">
        <p className="text-base font-medium text-gray-900">{q.question}</p>

        <div className="mt-4 space-y-2">
          {q.question_type === 'multiple_choice' && q.options ? (
            q.options.map((opt) => {
              const letter = opt.split(')')[0]?.trim()
              return (
                <button
                  key={opt}
                  onClick={() => setUserAnswer(letter ?? opt)}
                  disabled={step === 'result'}
                  className={`w-full rounded-md border px-4 py-2 text-left text-sm transition-colors ${
                    userAnswer === letter
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {opt}
                </button>
              )
            })
          ) : q.question_type === 'true_false' ? (
            ['True', 'False'].map((opt) => (
              <button
                key={opt}
                onClick={() => setUserAnswer(opt)}
                disabled={step === 'result'}
                className={`w-full rounded-md border px-4 py-2 text-left text-sm transition-colors ${
                  userAnswer === opt
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                {opt}
              </button>
            ))
          ) : (
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              disabled={step === 'result'}
              placeholder="Your answer…"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>

        {step === 'result' && lastResult && (
          <div
            className={`mt-3 rounded-md px-3 py-2 text-sm ${
              lastResult.isCorrect === null
                ? 'bg-gray-50 text-gray-600'
                : lastResult.isCorrect
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
            }`}
          >
            {lastResult.isCorrect === null
              ? `Model answer: ${q.correct_answer}`
              : lastResult.isCorrect
                ? 'Correct!'
                : `Incorrect. Correct answer: ${q.correct_answer}`}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        {step === 'answering' ? (
          <button
            onClick={handleSubmit}
            disabled={!userAnswer}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Submit
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {currentIndex + 1 < questions.length ? 'Next' : 'Finish'}
          </button>
        )}
      </div>
    </div>
  )
}

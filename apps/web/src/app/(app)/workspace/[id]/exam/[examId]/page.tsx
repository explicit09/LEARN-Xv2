'use client'

import { use, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import { ExamTimer } from '@/components/exam/ExamTimer'

interface ExamTakingPageProps {
  params: Promise<{ id: string; examId: string }>
}

type Question = {
  id: string
  question: string
  question_type: 'mcq' | 'short_answer' | 'true_false' | 'fill_blank'
  options: string[] | null
  bloom_level: string | null
  order_index: number
}

type AttemptState =
  | { phase: 'loading' }
  | { phase: 'taking'; attemptId: string; questions: Question[]; timeLimitMinutes: number | null }
  | { phase: 'submitting' }

function QuestionView({
  question,
  answer,
  onChange,
}: {
  question: Question
  answer: string
  onChange: (val: string) => void
}) {
  if (question.question_type === 'mcq' && question.options) {
    return (
      <fieldset>
        <legend className="sr-only">Options for: {question.question}</legend>
        <div className="space-y-2">
          {question.options.map((opt, i) => (
            <label
              key={i}
              className={[
                'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                answer === opt ? 'border-primary bg-primary/5' : 'hover:bg-accent/50',
              ].join(' ')}
            >
              <input
                type="radio"
                name={`q-${question.id}`}
                value={opt}
                checked={answer === opt}
                onChange={() => onChange(opt)}
                className="mt-0.5 shrink-0"
                aria-label={opt}
              />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      </fieldset>
    )
  }

  if (question.question_type === 'true_false') {
    return (
      <div className="flex gap-3" role="group" aria-label="True or False">
        {['true', 'false'].map((val) => (
          <button
            key={val}
            onClick={() => onChange(val)}
            className={[
              'flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors capitalize',
              answer === val
                ? 'border-primary bg-primary text-primary-foreground'
                : 'hover:bg-accent',
            ].join(' ')}
            aria-pressed={answer === val}
          >
            {val.charAt(0).toUpperCase() + val.slice(1)}
          </button>
        ))}
      </div>
    )
  }

  if (question.question_type === 'fill_blank') {
    return (
      <input
        type="text"
        value={answer}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Fill in the blank…"
        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label="Fill in the blank answer"
      />
    )
  }

  // short_answer
  return (
    <textarea
      value={answer}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Write your answer…"
      rows={4}
      className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
      aria-label="Short answer"
    />
  )
}

function ExamRunner({ workspaceId, examId }: { workspaceId: string; examId: string }) {
  const router = useRouter()
  const [state, setState] = useState<AttemptState>({ phase: 'loading' })
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [hasStarted, setHasStarted] = useState(false)

  const startMutation = trpc.exam.start.useMutation({
    onSuccess: (data) => {
      setState({
        phase: 'taking',
        attemptId: data.attempt.id,
        questions: data.questions as Question[],
        timeLimitMinutes: data.timeLimitMinutes ?? null,
      })
    },
    onError: (err) => {
      alert(`Failed to start exam: ${err.message}`)
    },
  })

  const submitResponseMutation = trpc.exam.submitResponse.useMutation()
  const completeMutation = trpc.exam.complete.useMutation({
    onSuccess: (data) => {
      if ('score' in data && data.score != null) {
        const params = new URLSearchParams({
          score: String(data.score),
          total: String(data.total),
          correct: String(data.correct),
        })
        router.push(`/workspace/${workspaceId}/exam/${examId}/score?${params.toString()}`)
      } else {
        router.push(`/workspace/${workspaceId}/exam/${examId}/score`)
      }
    },
  })

  const handleStart = () => {
    setHasStarted(true)
    startMutation.mutate({ examId, workspaceId })
  }

  const handleTimeUp = useCallback(() => {
    if (state.phase !== 'taking') return
    // Auto-submit all current answers
    handleCompleteExam(state.attemptId, state.questions)
  }, [state])

  async function handleCompleteExam(attemptId: string, questions: Question[]) {
    setState({ phase: 'submitting' })
    // Submit any unsaved answers
    const savePromises = questions
      .filter((q) => answers[q.id])
      .map((q) =>
        submitResponseMutation
          .mutateAsync({
            attemptId,
            questionId: q.id,
            userAnswer: answers[q.id] ?? '',
          })
          .catch(() => null),
      )
    await Promise.all(savePromises)
    completeMutation.mutate({ attemptId, workspaceId })
  }

  if (!hasStarted) {
    return (
      <div className="flex flex-col items-center gap-6 py-20 text-center">
        <h1 className="text-2xl font-bold">Ready to Begin?</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Once you start, the timer will begin. Make sure you have enough time to complete the exam.
        </p>
        <button
          onClick={handleStart}
          disabled={startMutation.isPending}
          className="rounded-md bg-primary px-6 py-2.5 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-opacity"
        >
          {startMutation.isPending ? 'Starting…' : 'Start Exam'}
        </button>
      </div>
    )
  }

  if (state.phase === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
          aria-label="Loading"
        />
      </div>
    )
  }

  if (state.phase === 'submitting') {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
          aria-label="Submitting"
        />
        <p className="text-sm text-muted-foreground">Scoring your exam…</p>
      </div>
    )
  }

  const { attemptId, questions, timeLimitMinutes } = state
  const currentQuestion = questions[currentIndex]
  if (!currentQuestion) return null

  const currentAnswer = answers[currentQuestion.id] ?? ''
  const progress = currentIndex + 1
  const total = questions.length

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          Question {progress} of {total}
        </p>
        {timeLimitMinutes && (
          <ExamTimer timeLimitMinutes={timeLimitMinutes} onTimeUp={handleTimeUp} />
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${(progress / total) * 100}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={1}
          aria-valuemax={total}
        />
      </div>

      {/* Question card */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
        {currentQuestion.bloom_level && (
          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground capitalize">
            {currentQuestion.bloom_level}
          </span>
        )}
        <p className="text-base font-medium leading-relaxed">{currentQuestion.question}</p>
        <QuestionView
          question={currentQuestion}
          answer={currentAnswer}
          onChange={(val) => setAnswers((prev) => ({ ...prev, [currentQuestion.id]: val }))}
        />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-40 transition-colors"
          aria-label="Previous question"
        >
          Previous
        </button>

        {currentIndex < total - 1 ? (
          <button
            onClick={() => {
              // Auto-save response on next
              if (currentAnswer) {
                submitResponseMutation.mutate({
                  attemptId,
                  questionId: currentQuestion.id,
                  userAnswer: currentAnswer,
                })
              }
              setCurrentIndex((i) => i + 1)
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-opacity"
            aria-label="Next question"
          >
            Next
          </button>
        ) : (
          <button
            onClick={() => handleCompleteExam(attemptId, questions)}
            disabled={completeMutation.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-opacity"
            aria-label="Submit exam"
          >
            Submit Exam
          </button>
        )}
      </div>

      {/* Question overview */}
      <div className="flex flex-wrap gap-1.5" role="navigation" aria-label="Question overview">
        {questions.map((q, i) => (
          <button
            key={q.id}
            onClick={() => setCurrentIndex(i)}
            className={[
              'h-8 w-8 rounded text-xs font-medium transition-colors',
              i === currentIndex
                ? 'bg-primary text-primary-foreground'
                : answers[q.id]
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground hover:bg-accent',
            ].join(' ')}
            aria-label={`Go to question ${i + 1}${answers[q.id] ? ' (answered)' : ''}`}
            aria-current={i === currentIndex ? 'true' : undefined}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ExamTakingPage({ params }: ExamTakingPageProps) {
  const { id, examId } = use(params)
  return (
    <div className="flex-1 p-6">
      <ExamRunner workspaceId={id} examId={examId} />
    </div>
  )
}

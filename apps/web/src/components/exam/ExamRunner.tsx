'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@learn-x/ui'
import { CheckCircle, XCircle, ArrowRight, RotateCcw, Clock, AlertCircle } from 'lucide-react'

interface ExamRunnerProps {
  examId: string
  workspaceId: string
}

type Step = 'intro' | 'answering' | 'reviewing' | 'done'

interface ExamQuestion {
  id: string
  question: string
  question_type: string
  options: string[] | null
  bloom_level: string | null
  order_index: number
}

interface ReviewItem {
  questionId: string
  userAnswer: string
  correctAnswer: string
  isCorrect: boolean | null
  feedback: string | null
}

export function ExamRunner({ examId, workspaceId }: ExamRunnerProps) {
  const { data: examInfo, isLoading } = trpc.exam.get.useQuery({
    examId,
    workspaceId,
  })
  const startExam = trpc.exam.start.useMutation()
  const submitResponse = trpc.exam.submitResponse.useMutation()
  const completeExam = trpc.exam.complete.useMutation()

  const [step, setStep] = useState<Step>('intro')
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<ExamQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<{
    score: number
    correct: number
    total: number
    reviewed: ReviewItem[]
  } | null>(null)

  if (isLoading || !examInfo) {
    return <div className="h-48 animate-pulse rounded-2xl bg-muted/50 border border-border" />
  }

  async function handleStart() {
    if (startExam.isPending) return
    const res = await startExam.mutateAsync({ examId, workspaceId })
    setAttemptId(res.attempt.id)
    setQuestions(res.questions as ExamQuestion[])
    setCurrentIndex(0)
    setUserAnswer('')
    setAnswers({})
    setResult(null)
    setStep('answering')
  }

  async function handleSaveAndNext() {
    if (!attemptId || submitResponse.isPending) return
    const q = questions[currentIndex]
    if (!q || !userAnswer) return

    await submitResponse.mutateAsync({
      attemptId,
      questionId: q.id,
      userAnswer,
    })

    const newAnswers = { ...answers, [q.id]: userAnswer }
    setAnswers(newAnswers)

    if (currentIndex + 1 < questions.length) {
      const nextQ = questions[currentIndex + 1]
      setCurrentIndex(currentIndex + 1)
      setUserAnswer(nextQ ? (newAnswers[nextQ.id] ?? '') : '')
    } else {
      // All questions answered, complete exam
      const res = await completeExam.mutateAsync({ attemptId, workspaceId })
      if ('alreadyCompleted' in res) {
        setStep('done')
        return
      }
      setResult({
        score: res.score,
        correct: res.correct,
        total: res.total,
        reviewed: res.reviewed as ReviewItem[],
      })
      setStep('reviewing')
    }
  }

  function handlePrev() {
    if (currentIndex > 0) {
      const prevQ = questions[currentIndex - 1]
      setCurrentIndex(currentIndex - 1)
      setUserAnswer(prevQ ? (answers[prevQ.id] ?? '') : '')
    }
  }

  function handleRetake() {
    setAttemptId(null)
    setQuestions([])
    setCurrentIndex(0)
    setUserAnswer('')
    setAnswers({})
    setResult(null)
    setStep('intro')
  }

  // ── Intro screen ─────────────────────────────────────────
  if (step === 'intro') {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-8 text-center max-w-lg mx-auto">
        <h2 className="text-xl font-bold text-foreground">{examInfo.title ?? 'Exam'}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {examInfo.questions?.length ?? 0} questions
          {examInfo.time_limit_minutes ? ` · ${examInfo.time_limit_minutes} min` : ''}
        </p>
        {examInfo.description && (
          <p className="mt-3 text-sm text-muted-foreground">{examInfo.description}</p>
        )}
        <Button
          onClick={handleStart}
          disabled={startExam.isPending}
          className="mt-6 rounded-xl px-8"
        >
          {startExam.isPending ? 'Starting...' : 'Start Exam'}
        </Button>
      </div>
    )
  }

  // ── Review screen (after completion) ─────────────────────
  if (step === 'reviewing' && result) {
    const pct = Math.round(result.score * 100)
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-8 text-center">
          <div
            className={`text-4xl sm:text-5xl font-black ${pct >= 70 ? 'text-emerald-500' : pct >= 50 ? 'text-amber-500' : 'text-red-500'}`}
          >
            {pct}%
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {result.correct} / {result.total} correct
          </p>
        </div>

        <div className="space-y-3">
          {result.reviewed.map((item, i) => {
            const q = questions.find((q) => q.id === item.questionId)
            return (
              <div key={item.questionId} className="rounded-xl border border-border bg-card/40 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {item.isCorrect === true ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    ) : item.isCorrect === false ? (
                      <XCircle className="w-5 h-5 text-red-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      Q{i + 1}. {q?.question}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Your answer:{' '}
                      <span className="font-medium text-foreground">{item.userAnswer}</span>
                    </p>
                    {item.isCorrect === false && (
                      <p className="text-xs text-emerald-500 mt-0.5">
                        Correct: {item.correctAnswer}
                      </p>
                    )}
                    {item.feedback && (
                      <p className="mt-2 text-xs text-muted-foreground italic">{item.feedback}</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex justify-center">
          <Button variant="outline" onClick={handleRetake} className="rounded-xl">
            <RotateCcw className="w-4 h-4 mr-2" />
            Retake
          </Button>
        </div>
      </div>
    )
  }

  // ── Done screen (already completed) ──────────────────────
  if (step === 'done') {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center max-w-lg mx-auto">
        <p className="text-sm text-muted-foreground">This exam attempt was already completed.</p>
        <Button variant="outline" onClick={handleRetake} className="mt-6 rounded-xl">
          <RotateCcw className="w-4 h-4 mr-2" />
          Start New Attempt
        </Button>
      </div>
    )
  }

  // ── Answering screen ─────────────────────────────────────
  const q = questions[currentIndex]
  if (!q) return null

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Question {currentIndex + 1} of {questions.length}
        </span>
        {q.bloom_level && (
          <span className="bg-muted px-2 py-0.5 rounded-md font-bold uppercase tracking-wider text-[10px]">
            {q.bloom_level}
          </span>
        )}
        <div className="h-1 flex-1 mx-4 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{
              width: `${((currentIndex + 1) / questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <p className="text-sm sm:text-base font-semibold text-foreground mb-4">{q.question}</p>

        <div className="space-y-2">
          {q.question_type === 'mcq' && q.options ? (
            q.options.map((opt) => {
              // Exam options may have "A) ..." prefix or be plain text
              const value = opt.includes(')') ? (opt.split(')')[0]?.trim() ?? opt) : opt
              const isSelected = userAnswer === value
              return (
                <button
                  key={opt}
                  onClick={() => setUserAnswer(value)}
                  className={`w-full rounded-xl border px-4 py-3 min-h-[44px] text-left text-sm transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border hover:bg-muted/50 text-foreground'
                  } cursor-pointer`}
                >
                  {opt}
                </button>
              )
            })
          ) : q.question_type === 'true_false' ? (
            ['True', 'False'].map((opt) => (
              <button
                key={opt}
                onClick={() => setUserAnswer(opt.toLowerCase())}
                className={`w-full rounded-xl border px-4 py-3 min-h-[44px] text-left text-sm transition-all ${
                  userAnswer === opt.toLowerCase()
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border hover:bg-muted/50 text-foreground'
                } cursor-pointer`}
              >
                {opt}
              </button>
            ))
          ) : (
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Your answer…"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          )}
        </div>
      </div>

      <div className="flex gap-2 justify-between">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="rounded-xl px-4 sm:px-6 flex-1 sm:flex-none"
        >
          Previous
        </Button>
        <Button
          onClick={handleSaveAndNext}
          disabled={!userAnswer || submitResponse.isPending || completeExam.isPending}
          className="rounded-xl px-4 sm:px-6 flex-1 sm:flex-none"
        >
          {completeExam.isPending ? (
            'Grading...'
          ) : currentIndex + 1 < questions.length ? (
            <>
              Next <ArrowRight className="w-4 h-4 ml-1" />
            </>
          ) : (
            'Finish Exam'
          )}
        </Button>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@learn-x/ui'
import {
  CheckCircle,
  XCircle,
  ArrowRight,
  RotateCcw,
  AlertCircle,
  Trophy,
  Target,
} from 'lucide-react'

interface QuizRunnerProps {
  quizId: string
  workspaceId: string
}

type Step = 'loading' | 'ready' | 'answering' | 'result' | 'done'

interface QuestionResult {
  questionIndex: number
  question: string
  userAnswer: string
  correctAnswer: string
  isCorrect: boolean | null
  feedback: string | null
}

export function QuizRunner({ quizId, workspaceId }: QuizRunnerProps) {
  const { data: quiz, isLoading } = trpc.quiz.get.useQuery({ id: quizId, workspaceId })
  const startAttempt = trpc.quiz.startAttempt.useMutation()
  const submitResponse = trpc.quiz.submitResponse.useMutation()
  const completeAttempt = trpc.quiz.completeAttempt.useMutation()

  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [lastResult, setLastResult] = useState<{
    isCorrect: boolean | null
    feedback: string | null
  } | null>(null)
  const [step, setStep] = useState<Step>('ready')
  const [finalScore, setFinalScore] = useState<number | null>(null)
  const [results, setResults] = useState<QuestionResult[]>([])

  if (isLoading || !quiz) {
    return <div className="h-48 animate-pulse rounded-2xl bg-muted/50 border border-border" />
  }

  const questions = quiz.questions as Array<{
    id: string
    question: string
    question_type: string
    options: string[] | null
    correct_answer: string
  }>

  async function handleStart() {
    if (startAttempt.isPending) return
    const attempt = await startAttempt.mutateAsync({ quizId, workspaceId })
    setAttemptId(attempt.id)
    setCurrentIndex(0)
    setUserAnswer('')
    setLastResult(null)
    setFinalScore(null)
    setResults([])
    setStep('answering')
  }

  async function handleSubmit() {
    if (!attemptId || submitResponse.isPending) return
    const q = questions[currentIndex]
    if (!q) return
    const result = await submitResponse.mutateAsync({
      attemptId,
      questionId: q.id,
      userAnswer,
    })
    const feedback = (result as { feedback?: string | null }).feedback ?? null
    setLastResult({ isCorrect: result.is_correct, feedback })
    setResults((prev) => [
      ...prev,
      {
        questionIndex: currentIndex,
        question: q.question,
        userAnswer,
        correctAnswer: q.correct_answer,
        isCorrect: result.is_correct,
        feedback,
      },
    ])
    setStep('result')
  }

  async function handleNext() {
    if (completeAttempt.isPending) return
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

  function handleRetake() {
    setAttemptId(null)
    setCurrentIndex(0)
    setUserAnswer('')
    setLastResult(null)
    setFinalScore(null)
    setResults([])
    setStep('ready')
  }

  if (step === 'ready') {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center max-w-lg mx-auto">
        <h2 className="text-xl font-bold text-foreground">{quiz.title ?? 'Quiz'}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{questions.length} questions</p>
        <Button
          onClick={handleStart}
          disabled={startAttempt.isPending}
          className="mt-6 rounded-xl px-8"
        >
          {startAttempt.isPending ? 'Starting...' : 'Start Quiz'}
        </Button>
      </div>
    )
  }

  if (step === 'done') {
    const pct = Math.round((finalScore ?? 0) * 100)
    const correctCount = results.filter((r) => r.isCorrect === true).length
    const incorrectCount = results.filter((r) => r.isCorrect === false).length
    const passed = pct >= 70

    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Score header */}
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <div className="mb-3">
            {passed ? (
              <Trophy className="w-10 h-10 text-emerald-500 mx-auto" />
            ) : (
              <Target className="w-10 h-10 text-amber-500 mx-auto" />
            )}
          </div>
          <div
            className={`text-5xl font-black ${pct >= 70 ? 'text-emerald-500' : pct >= 50 ? 'text-amber-500' : 'text-red-500'}`}
          >
            {pct}%
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {passed ? 'Great work!' : 'Keep studying!'}
          </p>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
            <div>
              <p className="text-2xl font-bold text-emerald-500">{correctCount}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Correct
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-500">{incorrectCount}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Incorrect
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{results.length}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Total
              </p>
            </div>
          </div>
        </div>

        {/* Per-question review */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
            Question Review
          </h3>
          {results.map((r, i) => (
            <div key={i} className="rounded-xl border border-border bg-card/40 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {r.isCorrect === true ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  ) : r.isCorrect === false ? (
                    <XCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    Q{i + 1}. {r.question}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your answer: <span className="font-medium text-foreground">{r.userAnswer}</span>
                  </p>
                  {r.isCorrect === false && (
                    <p className="text-xs text-emerald-500 mt-0.5">Correct: {r.correctAnswer}</p>
                  )}
                  {r.feedback && (
                    <p className="mt-2 text-xs text-muted-foreground italic">{r.feedback}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
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

  const q = questions[currentIndex]
  if (!q) return null

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Question {currentIndex + 1} of {questions.length}
        </span>
        <div className="h-1 flex-1 mx-4 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-base font-semibold text-foreground mb-4">{q.question}</p>

        <div className="space-y-2">
          {q.question_type === 'multiple_choice' && q.options ? (
            q.options.map((opt) => {
              const letter = opt.split(')')[0]?.trim()
              const isSelected = userAnswer === letter
              return (
                <button
                  key={opt}
                  onClick={() => setUserAnswer(letter ?? opt)}
                  disabled={step === 'result'}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border hover:bg-muted/50 text-foreground'
                  } ${step === 'result' ? 'cursor-default' : 'cursor-pointer'}`}
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
                className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                  userAnswer === opt
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border hover:bg-muted/50 text-foreground'
                } ${step === 'result' ? 'cursor-default' : 'cursor-pointer'}`}
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
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          )}
        </div>

        {step === 'result' && lastResult && (
          <div
            className={`mt-4 rounded-xl px-4 py-3 text-sm ${
              lastResult.isCorrect === null
                ? 'bg-muted text-muted-foreground'
                : lastResult.isCorrect
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-500 border border-red-500/20'
            }`}
          >
            <div className="flex items-center gap-2">
              {lastResult.isCorrect === null ? (
                <span>Model answer: {q.correct_answer}</span>
              ) : lastResult.isCorrect ? (
                <>
                  <CheckCircle className="w-4 h-4" /> Correct!
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" /> Incorrect. Answer: {q.correct_answer}
                </>
              )}
            </div>
            {lastResult.feedback && (
              <p className="mt-2 text-xs opacity-80">{lastResult.feedback}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        {step === 'answering' ? (
          <Button
            onClick={handleSubmit}
            disabled={!userAnswer || submitResponse.isPending}
            className="rounded-xl px-6"
          >
            Submit
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={completeAttempt.isPending}
            className="rounded-xl px-6"
          >
            {currentIndex + 1 < questions.length ? (
              <>
                Next <ArrowRight className="w-4 h-4 ml-1" />
              </>
            ) : (
              'Finish'
            )}
          </Button>
        )}
      </div>
    </div>
  )
}

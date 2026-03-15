'use client'

import { useState } from 'react'

interface MiniQuizProps {
  question: string
  options: { label: string; text: string; is_correct: boolean }[]
  explanation: string
}

export function MiniQuiz({ question, options, explanation }: MiniQuizProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const answered = selected !== null
  const correct = options.find((o) => o.label === selected)?.is_correct ?? false

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Quick Check
      </p>
      <p className="text-sm font-medium">{question}</p>
      <div className="space-y-2">
        {options.map((opt) => {
          const isSelected = selected === opt.label
          const showResult = answered
          let className =
            'w-full text-left text-sm px-3 py-2 rounded border transition-colors cursor-pointer '
          if (!answered) {
            className += 'border-border hover:border-foreground/40 hover:bg-muted/40'
          } else if (opt.is_correct) {
            className +=
              'border-green-500 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100'
          } else if (isSelected && !opt.is_correct) {
            className += 'border-red-400 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100'
          } else {
            className += 'border-border opacity-50'
          }

          return (
            <button
              key={opt.label}
              className={className}
              onClick={() => !answered && setSelected(opt.label)}
              disabled={answered}
            >
              <span className="font-medium mr-2">{opt.label}.</span>
              {opt.text}
            </button>
          )
        })}
      </div>
      {answered && (
        <div
          className={`text-sm p-2 rounded ${correct ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}
        >
          {correct ? '✓ Correct! ' : '✗ Not quite. '}
          {explanation}
        </div>
      )}
    </div>
  )
}

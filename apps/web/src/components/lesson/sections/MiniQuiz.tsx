'use client'

import { useState } from 'react'
import { HelpCircle, CheckCircle2, XCircle } from 'lucide-react'

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
    <div className="rounded-3xl border-2 border-dashed border-amber-400/40 bg-amber-500/[0.03] p-6 lg:p-8 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
          <HelpCircle className="w-4 h-4 text-amber-600" />
        </div>
        <span className="text-sm font-bold uppercase tracking-widest text-amber-600">
          Quick Check
        </span>
      </div>
      <p className="text-base font-semibold text-foreground leading-relaxed">{question}</p>
      <div className="space-y-2">
        {options.map((opt) => {
          const isSelected = selected === opt.label
          let cls =
            'w-full text-left px-4 py-3 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-3 '
          if (!answered) {
            cls += 'border-border/60 hover:border-amber-400/50 hover:bg-amber-500/5 active:scale-[0.99]'
          } else if (opt.is_correct) {
            cls += 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
          } else if (isSelected && !opt.is_correct) {
            cls += 'border-red-400 bg-red-50 dark:bg-red-950/30'
          } else {
            cls += 'border-border/30 opacity-40'
          }

          return (
            <button
              key={opt.label}
              className={cls}
              onClick={() => !answered && setSelected(opt.label)}
              disabled={answered}
            >
              <span className="shrink-0 w-7 h-7 rounded-full bg-muted/60 flex items-center justify-center text-xs font-bold">
                {opt.label}
              </span>
              <span className="text-sm font-medium">{opt.text}</span>
              {answered && opt.is_correct && (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto shrink-0" />
              )}
              {answered && isSelected && !opt.is_correct && (
                <XCircle className="w-5 h-5 text-red-400 ml-auto shrink-0" />
              )}
            </button>
          )
        })}
      </div>
      {answered && (
        <div
          className={`text-sm p-4 rounded-xl border ${
            correct
              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}
        >
          <span className="font-bold">{correct ? 'Correct! ' : 'Not quite. '}</span>
          {explanation}
        </div>
      )}
    </div>
  )
}

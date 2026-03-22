'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@learn-x/ui'
import { Input } from '@learn-x/ui'
import { trpc } from '@/lib/trpc/client'

type MotivationalStyle = 'challenge' | 'progress' | 'mastery' | 'curiosity'
type TonePreference = 'casual' | 'balanced' | 'academic' | 'socratic'
type DifficultyPreference = 'beginner' | 'intermediate' | 'advanced' | 'adaptive'

const MOTIVATIONAL_OPTIONS: { value: MotivationalStyle; label: string; desc: string }[] = [
  { value: 'challenge', label: 'Challenge', desc: 'Push my limits with hard problems' },
  { value: 'progress', label: 'Progress', desc: 'See steady improvement over time' },
  { value: 'mastery', label: 'Mastery', desc: 'Truly understand every concept' },
  { value: 'curiosity', label: 'Curiosity', desc: 'Explore ideas and connections' },
]

const TONE_OPTIONS: { value: TonePreference; label: string }[] = [
  { value: 'casual', label: 'Casual' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'academic', label: 'Academic' },
  { value: 'socratic', label: 'Socratic' },
]

const DIFFICULTY_OPTIONS: { value: DifficultyPreference; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'adaptive', label: 'Adaptive' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [displayName, setDisplayName] = useState('')
  const [interestInput, setInterestInput] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [motivationalStyle, setMotivationalStyle] = useState<MotivationalStyle>('mastery')
  const [tonePreference, setTonePreference] = useState<TonePreference>('balanced')
  const [difficultyPreference, setDifficultyPreference] = useState<DifficultyPreference>('adaptive')
  const [error, setError] = useState<string | null>(null)

  const updateProfile = trpc.user.updateProfile.useMutation()
  const upsertPersona = trpc.user.upsertPersona.useMutation()
  const completeOnboarding = trpc.user.completeOnboarding.useMutation()

  function addInterest() {
    const trimmed = interestInput.trim()
    if (trimmed && !interests.includes(trimmed)) {
      setInterests([...interests, trimmed])
    }
    setInterestInput('')
  }

  function removeInterest(interest: string) {
    setInterests(interests.filter((i) => i !== interest))
  }

  async function handleFinish() {
    setError(null)
    try {
      await updateProfile.mutateAsync({ displayName: displayName.trim() || undefined })
      await upsertPersona.mutateAsync({
        interests,
        motivationalStyle,
        tonePreference,
        difficultyPreference,
      })
      await completeOnboarding.mutateAsync()
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  const isLoading =
    updateProfile.isPending || upsertPersona.isPending || completeOnboarding.isPending

  return (
    <div className="flex flex-1 items-center justify-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-lg">
        <div className="mb-2 flex gap-1">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? 'bg-foreground' : 'bg-muted'}`}
            />
          ))}
        </div>
        <p className="mb-6 text-xs text-muted-foreground">Step {step} of 3</p>

        {step === 1 && (
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">What should we call you?</h2>
            <p className="mt-1 text-sm text-muted-foreground">You can change this later.</p>
            <div className="mt-6 flex flex-col gap-1.5">
              <label htmlFor="display-name" className="text-sm font-medium">
                Your name
              </label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Alice Smith"
                autoFocus
              />
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setStep(2)}>Continue</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">What are you into?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add topics you care about — we&apos;ll use these to tailor analogies and examples.
            </p>
            <div className="mt-6">
              <div className="flex gap-2">
                <Input
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  placeholder="e.g. basketball, finance, cooking…"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addInterest()
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addInterest}>
                  Add
                </Button>
              </div>
              {interests.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {interests.map((i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm"
                    >
                      {i}
                      <button
                        onClick={() => removeInterest(i)}
                        className="ml-0.5 text-muted-foreground hover:text-foreground"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)}>Continue</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">How do you like to learn?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This shapes how lessons and explanations are generated for you.
            </p>
            <div className="mt-6 space-y-5">
              <div>
                <p className="mb-2 text-sm font-medium">What drives you?</p>
                <div className="grid grid-cols-2 gap-2">
                  {MOTIVATIONAL_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setMotivationalStyle(opt.value)}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        motivationalStyle === opt.value
                          ? 'border-foreground bg-muted'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Tone preference</p>
                <div className="grid grid-cols-2 sm:flex gap-2">
                  {TONE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setTonePreference(opt.value)}
                      className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                        tonePreference === opt.value
                          ? 'border-foreground bg-muted font-medium'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Starting difficulty</p>
                <div className="grid grid-cols-2 sm:flex gap-2">
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setDifficultyPreference(opt.value)}
                      className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                        difficultyPreference === opt.value
                          ? 'border-foreground bg-muted font-medium'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={handleFinish} disabled={isLoading}>
                {isLoading ? 'Saving…' : 'Start learning'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

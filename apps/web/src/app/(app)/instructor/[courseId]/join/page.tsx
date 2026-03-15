'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import { Topbar } from '@/components/layout/Topbar'

interface JoinPageProps {
  params: Promise<{ courseId: string }>
}

function JoinCourseForm({ courseId }: { courseId: string }) {
  const router = useRouter()
  const { data: course } = trpc.course.get.useQuery({ courseId })
  const [joinCode, setJoinCode] = useState('')
  const joinMutation = trpc.course.join.useMutation({
    onSuccess: (data) => {
      router.push(`/dashboard`)
    },
  })

  if (!course) {
    return (
      <div className="flex items-center justify-center py-20">
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
          aria-label="Loading"
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md space-y-6 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Join Course</h1>
        <p className="text-muted-foreground">{course.title}</p>
      </div>

      <div className="rounded-lg border bg-card p-6 text-left space-y-4">
        <div>
          <label htmlFor="join-code-input" className="text-sm font-medium">
            Enter Join Code
          </label>
          <input
            id="join-code-input"
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ABCD1234"
            maxLength={8}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-primary uppercase"
            aria-label="8-character join code"
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Ask your instructor for the 8-character course code
          </p>
        </div>

        {joinMutation.isError && (
          <p className="text-sm text-destructive" role="alert">
            {joinMutation.error.message}
          </p>
        )}

        <button
          onClick={() => joinMutation.mutate({ joinCode })}
          disabled={joinCode.length !== 8 || joinMutation.isPending}
          className="w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-opacity"
          aria-label="Join course"
        >
          {joinMutation.isPending ? 'Joining…' : 'Join Course'}
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Already enrolled?{' '}
        <a href="/dashboard" className="text-primary hover:underline">
          Go to dashboard
        </a>
      </p>
    </div>
  )
}

export default function JoinCoursePage({ params }: JoinPageProps) {
  const { courseId } = use(params)
  return (
    <>
      <Topbar title="Join Course" />
      <div className="flex-1 p-6">
        <JoinCourseForm courseId={courseId} />
      </div>
    </>
  )
}

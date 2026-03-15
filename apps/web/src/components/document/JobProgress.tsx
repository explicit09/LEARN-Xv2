'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

interface Job {
  id: string
  status: string
  progress: number
  error: string | null
}

interface JobProgressProps {
  jobId: string
  initialJob?: Job
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Queued',
  running: 'Processing',
  completed: 'Ready',
  failed: 'Failed',
  cancelled: 'Cancelled',
}

export function JobProgress({ jobId, initialJob }: JobProgressProps) {
  const [job, setJob] = useState<Job | null>(initialJob ?? null)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const channel = supabase
      .channel(`job:${jobId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'jobs', filter: `id=eq.${jobId}` },
        (payload) => {
          setJob(payload.new as Job)
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [jobId])

  if (!job) return null

  const isComplete = job.status === 'completed'
  const isFailed = job.status === 'failed'
  const isActive = job.status === 'running' || job.status === 'pending'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span
          className={[
            'font-medium',
            isComplete
              ? 'text-green-600'
              : isFailed
                ? 'text-destructive'
                : 'text-muted-foreground',
          ].join(' ')}
        >
          {STATUS_LABEL[job.status] ?? job.status}
        </span>
        {isActive && <span className="text-muted-foreground">{job.progress}%</span>}
      </div>

      {isActive && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-foreground transition-all duration-500"
            style={{ width: `${job.progress}%` }}
          />
        </div>
      )}

      {isFailed && job.error && <p className="text-xs text-destructive">{job.error}</p>}
    </div>
  )
}

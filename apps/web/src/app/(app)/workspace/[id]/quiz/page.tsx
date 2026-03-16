import { QuizList } from '@/components/quiz/QuizList'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createServerCaller } from '@/lib/trpc/server'

interface Props {
  params: Promise<{ id: string }>
}

export default async function QuizIndexPage({ params }: Props) {
  const { id } = await params
  const caller = await createServerCaller()
  const workspace = await caller.workspace.get({ id }).catch(() => null)

  return (
    <div className="flex-1 overflow-auto p-4 md:p-8 flex flex-col gap-6 max-w-[1400px] mx-auto w-full">
      {/* Header */}
      <div className="space-y-4 mb-2">
        <Link
          href={`/workspace/${id}?tab=quiz`}
          className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to workspace
        </Link>
        {workspace && (
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground">
            {workspace.name as string} <span className="text-muted-foreground/30">— Quizzes</span>
          </h1>
        )}
      </div>

      <div className="max-w-4xl">
        <QuizList workspaceId={id} />
      </div>
    </div>
  )
}

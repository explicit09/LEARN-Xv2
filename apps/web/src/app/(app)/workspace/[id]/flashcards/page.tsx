import Link from 'next/link'
import { FlashcardReview } from '@/components/flashcard/FlashcardReview'
import { FlashcardSetList } from '@/components/flashcard/FlashcardSetList'
import { createServerCaller } from '@/lib/trpc/server'

interface Props {
  params: Promise<{ id: string }>
}

export default async function FlashcardsPage({ params }: Props) {
  const { id } = await params
  const caller = await createServerCaller()
  const workspace = await caller.workspace.get({ id }).catch(() => null)

  return (
    <div className="p-6 space-y-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <Link
          href={`/workspace/${id}?tab=flashcards`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <span aria-hidden="true">&larr;</span> Back to workspace
        </Link>
        {workspace && (
          <h1 className="text-lg font-semibold text-foreground">{workspace.name} — Flashcards</h1>
        )}
      </div>

      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-900">Due for Review</h2>
        <FlashcardReview workspaceId={id} />
      </section>
      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-900">All Sets</h2>
        <FlashcardSetList workspaceId={id} />
      </section>
    </div>
  )
}

import { FlashcardReview } from '@/components/flashcard/FlashcardReview'
import { FlashcardSetList } from '@/components/flashcard/FlashcardSetList'

interface Props {
  params: Promise<{ id: string }>
}

export default async function FlashcardsPage({ params }: Props) {
  const { id } = await params
  return (
    <div className="p-6 space-y-8 max-w-2xl mx-auto">
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

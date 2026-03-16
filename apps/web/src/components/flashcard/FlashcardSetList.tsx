'use client'

import Link from 'next/link'
import { trpc } from '@/lib/trpc/client'

interface FlashcardSetListProps {
  workspaceId: string
}

export function FlashcardSetList({ workspaceId }: FlashcardSetListProps) {
  const { data: sets, isLoading } = trpc.flashcard.listSets.useQuery({ workspaceId })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    )
  }

  if (!sets?.length) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p className="text-sm">No flashcard sets yet.</p>
        <p className="mt-1 text-xs text-gray-400">
          Flashcards are generated automatically after document processing.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sets.map((set) => (
        <Link
          key={set.id}
          href={`/workspace/${workspaceId}/flashcards/${set.id}`}
          className="block rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <p className="font-medium text-gray-900">{set.title}</p>
            <span className="text-xs text-gray-400">
              {new Date(set.created_at as string).toLocaleDateString()}
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}

'use client'

import { trpc } from '@/lib/trpc/client'

interface ConceptListProps {
  workspaceId: string
}

export function ConceptList({ workspaceId }: ConceptListProps) {
  const { data: concepts, isLoading } = trpc.concept.list.useQuery({ workspaceId })

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  if (!concepts?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No concepts yet. Concepts are extracted automatically after a document finishes processing.
      </p>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Name</th>
            <th className="px-4 py-2 text-left font-medium">Description</th>
            <th className="px-4 py-2 text-left font-medium">Tags</th>
          </tr>
        </thead>
        <tbody>
          {concepts.map((concept) => (
            <tr key={concept.id as string} className="border-t hover:bg-muted/20">
              <td className="px-4 py-3 font-medium">{concept.name as string}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {(concept.description as string | null) ?? '—'}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {((concept.tags as string[]) ?? []).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

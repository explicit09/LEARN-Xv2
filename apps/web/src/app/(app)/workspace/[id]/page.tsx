import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { WorkspaceDocuments } from '@/components/document/WorkspaceDocuments'
import { ConceptList } from '@/components/concept/ConceptList'
import { SyllabusView } from '@/components/syllabus/SyllabusView'
import { createServerCaller } from '@/lib/trpc/server'

interface WorkspacePageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

const TABS = [
  { key: 'documents', label: 'Documents' },
  { key: 'concepts', label: 'Concepts' },
  { key: 'syllabus', label: 'Syllabus' },
] as const

type TabKey = (typeof TABS)[number]['key']

export default async function WorkspacePage({ params, searchParams }: WorkspacePageProps) {
  const { id } = await params
  const { tab } = await searchParams
  const activeTab: TabKey = (TABS.map((t) => t.key).includes(tab as TabKey) ? tab : 'documents') as TabKey

  const caller = await createServerCaller()

  let workspace
  try {
    workspace = await caller.workspace.get({ id })
  } catch {
    notFound()
  }

  const documents = await caller.document.list({ workspaceId: id }).catch(() => [])
  const hasDocuments = documents.length > 0

  return (
    <>
      <Topbar title={workspace.name} />
      <div className="flex-1 p-6">
        {/* Tab bar */}
        <div className="mb-6 flex gap-1 border-b">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/workspace/${id}?tab=${t.key}`}
              className={[
                'px-4 py-2 text-sm font-medium transition-colors',
                activeTab === t.key
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'documents' && <WorkspaceDocuments workspaceId={id} />}
        {activeTab === 'concepts' && <ConceptList workspaceId={id} />}
        {activeTab === 'syllabus' && (
          <SyllabusView workspaceId={id} hasDocuments={hasDocuments} />
        )}
      </div>
    </>
  )
}

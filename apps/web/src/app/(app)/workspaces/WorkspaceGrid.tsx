'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { CreateWorkspaceModal } from '@/components/workspace/CreateWorkspaceModal'
import { WorkspaceCard } from '@/components/workspace/WorkspaceCard'
import type { WorkspaceItem } from './WorkspacesV1'

export function WorkspaceGrid({ workspaces }: { workspaces: WorkspaceItem[] }) {
  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        layout
        className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3 lg:auto-rows-[320px]"
      >
        {workspaces.map((workspace) => (
          <motion.div
            key={workspace.id}
            layout
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="min-h-[160px] sm:h-[280px] lg:h-[320px]"
          >
            <WorkspaceCard
              id={workspace.id}
              name={workspace.name}
              description={workspace.description ?? null}
              status={workspace.status}
              totalTokenCount={workspace.total_token_count}
              documentsCount={workspace.documentsCount}
              conceptsCount={workspace.conceptsCount}
              lessonsCount={workspace.lessonsCount}
              completedLessonsCount={workspace.completedLessonsCount}
              progressLabel={workspace.progressLabel}
              summary={workspace.summary}
              tokenLabel={workspace.tokenLabel}
              nextActionLabel={workspace.nextActionLabel}
              nextActionHref={workspace.nextActionHref}
              statusTone={workspace.statusTone}
              updatedAt={workspace.updated_at}
              createdAt={workspace.created_at}
            />
          </motion.div>
        ))}

        <motion.div
          layout
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="h-[160px] sm:h-[280px] lg:h-[320px]"
        >
          <CreateWorkspaceModal
            trigger={
              <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-muted/50 p-4 text-center transition-all hover:border-primary/40 hover:bg-muted sm:p-5 md:rounded-2xl md:p-6">
                <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-muted transition-transform duration-300 group-hover:scale-110">
                  <Plus className="h-6 w-6 text-muted-foreground transition-colors" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Create New</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Start a new learning track</p>
                </div>
              </div>
            }
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

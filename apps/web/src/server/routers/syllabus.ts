import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import type { SupabaseClient } from '@supabase/supabase-js'
import { createTRPCRouter, protectedProcedure } from '../trpc'

async function resolveUserId(supabase: SupabaseClient, authId: string): Promise<string> {
  const { data: user, error } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', authId)
    .single()
  if (error || !user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
  return user.id
}

async function resolveWorkspace(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
): Promise<string> {
  const { data: workspace, error } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .eq('user_id', userId)
    .single()
  if (error || !workspace)
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace not found' })
  return workspace.id
}

export const syllabusRouter = createTRPCRouter({
  update: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().uuid(),
        syllabusId: z.string().uuid(),
        units: z.array(
          z.object({
            id: z.string().uuid(),
            orderIndex: z.number().int().min(0),
            topics: z.array(
              z.object({
                id: z.string().uuid(),
                orderIndex: z.number().int().min(0),
              }),
            ),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)
      await resolveWorkspace(ctx.supabase, input.workspaceId, userId)

      // Verify syllabus belongs to workspace
      const { data: syllabus } = await ctx.supabase
        .from('syllabuses')
        .select('id')
        .eq('id', input.syllabusId)
        .eq('workspace_id', input.workspaceId)
        .single()
      if (!syllabus) throw new TRPCError({ code: 'NOT_FOUND', message: 'Syllabus not found' })

      // Update unit and topic ordering
      for (const unit of input.units) {
        await ctx.supabase
          .from('syllabus_units')
          .update({ order_index: unit.orderIndex })
          .eq('id', unit.id)
          .eq('syllabus_id', input.syllabusId)
        for (const topic of unit.topics) {
          await ctx.supabase
            .from('syllabus_topics')
            .update({ order_index: topic.orderIndex })
            .eq('id', topic.id)
            .eq('unit_id', unit.id)
        }
      }

      return { success: true }
    }),

  get: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)
      await resolveWorkspace(ctx.supabase, input.workspaceId, userId)

      // Fetch active syllabus
      const { data: syllabus } = await ctx.supabase
        .from('syllabuses')
        .select('id, version, status, created_at')
        .eq('workspace_id', input.workspaceId)
        .eq('status', 'active')
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!syllabus) return null

      // Fetch units ordered by order_index
      const { data: units } = await ctx.supabase
        .from('syllabus_units')
        .select('id, title, order_index')
        .eq('syllabus_id', syllabus.id)
        .order('order_index', { ascending: true })

      if (!units || units.length === 0) {
        return { ...syllabus, units: [] }
      }

      // Fetch topics for all units
      const unitIds = units.map((u) => u.id)
      const { data: topics } = await ctx.supabase
        .from('syllabus_topics')
        .select('id, unit_id, title, description, order_index')
        .in('unit_id', unitIds)
        .order('order_index', { ascending: true })

      // Fetch concept names linked to each topic
      const topicIds = (topics ?? []).map((t) => t.id)
      let topicConceptMap: Record<string, string[]> = {}
      if (topicIds.length > 0) {
        const { data: topicConcepts } = await ctx.supabase
          .from('syllabus_topic_concepts')
          .select('topic_id, concepts(name)')
          .in('topic_id', topicIds)
        for (const row of topicConcepts ?? []) {
          const name = (row.concepts as unknown as { name: string } | null)?.name
          if (name) {
            topicConceptMap[row.topic_id] ??= []
            topicConceptMap[row.topic_id]!.push(name)
          }
        }
      }

      // Fetch document titles linked to each topic
      let topicDocMap: Record<string, string[]> = {}
      if (topicIds.length > 0) {
        const { data: topicDocs } = await ctx.supabase
          .from('syllabus_topic_documents')
          .select('topic_id, documents(title)')
          .in('topic_id', topicIds)
        for (const row of topicDocs ?? []) {
          const title = (row.documents as unknown as { title: string } | null)?.title
          if (title) {
            topicDocMap[row.topic_id] ??= []
            topicDocMap[row.topic_id]!.push(title)
          }
        }
      }

      // Assemble result
      const unitsWithTopics = units.map((unit) => ({
        ...unit,
        topics: (topics ?? [])
          .filter((t) => t.unit_id === unit.id)
          .map((topic) => ({
            ...topic,
            conceptNames: topicConceptMap[topic.id] ?? [],
            documentTitles: topicDocMap[topic.id] ?? [],
          })),
      }))

      return { ...syllabus, units: unitsWithTopics }
    }),
})

import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'

import { tagConceptSchema, getGraphSchema } from '@learn-x/validators'

import { createTRPCRouter, protectedProcedure } from '../trpc'

async function resolveUserId(supabase: SupabaseClient, authId: string): Promise<string> {
  const { data: user, error } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', authId)
    .single()
  if (error || !user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
  return user.id as string
}

export const knowledgeGraphRouter = createTRPCRouter({
  /**
   * Get concept graph for a workspace: nodes (concepts + mastery) + edges (relations).
   */
  getGraph: protectedProcedure.input(getGraphSchema).query(async ({ ctx, input }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)

    // Verify workspace access
    const { data: workspace } = await ctx.supabase
      .from('workspaces')
      .select('id')
      .eq('id', input.workspaceId)
      .eq('user_id', userId)
      .maybeSingle()

    if (!workspace) throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace not found' })

    // Fetch concepts in workspace
    const { data: concepts } = await ctx.supabase
      .from('concepts')
      .select('id, name')
      .eq('workspace_id', input.workspaceId)
      .limit(100)

    if (!concepts?.length) return { nodes: [], edges: [] }

    const conceptIds = concepts.map((c) => c.id as string)

    // Fetch mastery records for this user
    const { data: masteryRecords } = await ctx.supabase
      .from('mastery_records')
      .select('concept_id, mastery_level')
      .eq('user_id', userId)
      .in('concept_id', conceptIds)

    const masteryMap: Record<string, number> = {}
    for (const r of masteryRecords ?? []) {
      masteryMap[r.concept_id as string] = r.mastery_level as number
    }

    // Fetch concept tags
    const { data: tags } = await ctx.supabase
      .from('concept_tags')
      .select('concept_id, tag, domain')
      .in('concept_id', conceptIds)

    const tagMap: Record<string, { tag: string; domain: string | null }> = {}
    for (const t of tags ?? []) {
      tagMap[t.concept_id as string] = {
        tag: t.tag as string,
        domain: t.domain as string | null,
      }
    }

    // Build nodes
    const nodes = concepts.map((c) => ({
      id: c.id as string,
      name: c.name as string,
      masteryLevel: masteryMap[c.id as string] ?? null,
      tag: tagMap[c.id as string]?.tag ?? null,
      domain: tagMap[c.id as string]?.domain ?? null,
    }))

    // Fetch relations (both from concept_relations and concept_relations_global)
    const { data: localRelations } = await ctx.supabase
      .from('concept_relations')
      .select('source_concept_id, target_concept_id, relation_type')
      .in('source_concept_id', conceptIds)
      .in('target_concept_id', conceptIds)

    const { data: globalRelations } = await ctx.supabase
      .from('concept_relations_global')
      .select('source_concept_id, target_concept_id, relation_type')
      .in('source_concept_id', conceptIds)
      .in('target_concept_id', conceptIds)

    const allRelations = [...(localRelations ?? []), ...(globalRelations ?? [])]
    const edges = allRelations.map((r) => ({
      source: r.source_concept_id as string,
      target: r.target_concept_id as string,
      relationType: r.relation_type as string,
    }))

    return { nodes, edges }
  }),

  /**
   * Tag a concept with a canonical domain slug.
   */
  tagConcept: protectedProcedure.input(tagConceptSchema).mutation(async ({ ctx, input }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)

    // Verify ownership: concept must belong to user's workspace
    const { data: concept } = await ctx.supabase
      .from('concepts')
      .select('id, workspace_id')
      .eq('id', input.conceptId)
      .maybeSingle()

    if (!concept) throw new TRPCError({ code: 'NOT_FOUND', message: 'Concept not found' })

    const { data: workspace } = await ctx.supabase
      .from('workspaces')
      .select('id')
      .eq('id', concept.workspace_id as string)
      .eq('user_id', userId)
      .maybeSingle()

    if (!workspace) throw new TRPCError({ code: 'NOT_FOUND', message: 'Concept not found' })

    const { error } = await ctx.supabase.from('concept_tags').upsert(
      {
        concept_id: input.conceptId,
        tag: input.tag,
        domain: input.domain ?? null,
      },
      { onConflict: 'concept_id,tag' },
    )

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return { success: true }
  }),

  /**
   * Add a global relation between two concepts.
   */
  addRelation: protectedProcedure
    .input(
      z.object({
        sourceConcept: z.string().uuid(),
        targetConcept: z.string().uuid(),
        relationType: z.enum(['prerequisite', 'related', 'extends', 'part_of']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)

      // Verify both concepts are in the user's workspace.
      const { data: sourceConcept } = await ctx.supabase
        .from('concepts')
        .select('id, workspace_id')
        .eq('id', input.sourceConcept)
        .maybeSingle()

      if (!sourceConcept) throw new TRPCError({ code: 'NOT_FOUND', message: 'Concept not found' })

      const { data: sourceWorkspace } = await ctx.supabase
        .from('workspaces')
        .select('id')
        .eq('id', sourceConcept.workspace_id as string)
        .eq('user_id', userId)
        .maybeSingle()

      if (!sourceWorkspace) throw new TRPCError({ code: 'NOT_FOUND', message: 'Concept not found' })

      const { data: targetConcept } = await ctx.supabase
        .from('concepts')
        .select('id, workspace_id')
        .eq('id', input.targetConcept)
        .maybeSingle()

      if (!targetConcept) throw new TRPCError({ code: 'NOT_FOUND', message: 'Concept not found' })

      const { data: targetWorkspace } = await ctx.supabase
        .from('workspaces')
        .select('id')
        .eq('id', targetConcept.workspace_id as string)
        .eq('user_id', userId)
        .maybeSingle()

      if (!targetWorkspace) throw new TRPCError({ code: 'NOT_FOUND', message: 'Concept not found' })

      const { error } = await ctx.supabase.from('concept_relations_global').upsert(
        {
          source_concept_id: input.sourceConcept,
          target_concept_id: input.targetConcept,
          relation_type: input.relationType,
        },
        { onConflict: 'source_concept_id,target_concept_id,relation_type' },
      )

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),
})

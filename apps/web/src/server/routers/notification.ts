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
  return user.id as string
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
  return workspace.id as string
}

export const notificationRouter = createTRPCRouter({
  /**
   * Get daily digest: due flashcards count, fading concepts, study streak.
   */
  getDailyDigest: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)
      let workspaceIds: string[] = []

      if (input.workspaceId) {
        workspaceIds = [await resolveWorkspace(ctx.supabase, input.workspaceId, userId)]
      } else {
        const { data: workspaces } = await ctx.supabase
          .from('workspaces')
          .select('id')
          .eq('user_id', userId)
          .limit(25)
        workspaceIds = (workspaces ?? []).map((w) => w.id as string)
      }

      // Count due flashcards
      let dueFlashcards = 0
      if (workspaceIds.length > 0) {
        const { data: dueSets } = await ctx.supabase
          .from('flashcard_sets')
          .select(
            `id, workspace_id,
             flashcards!inner(id, due_at)`,
          )
          .in('workspace_id', workspaceIds)
          .lt('flashcards.due_at', new Date().toISOString())

        dueFlashcards = (dueSets ?? []).reduce((sum, set) => {
          const cards = (set.flashcards as { id: string }[] | null) ?? []
          return sum + cards.length
        }, 0)
      }

      // Fading concepts: mastery records with low/declining mastery
      let masteryQuery = ctx.supabase
        .from('mastery_records')
        .select('concept_id, mastery_level')
        .eq('user_id', userId)
        .lt('mastery_level', 0.5)
        .order('mastery_level', { ascending: true })
        .limit(5)

      if (input.workspaceId) {
        masteryQuery = masteryQuery.eq('workspace_id', input.workspaceId)
      }

      const { data: fadingMastery } = await masteryQuery

      // Get concept names for fading concepts
      const conceptIds = (fadingMastery ?? []).map((m) => m.concept_id).filter(Boolean)
      let fadingConcepts: Array<{ id: string; name: string; masteryLevel: number }> = []

      if (conceptIds.length > 0) {
        const { data: concepts } = await ctx.supabase
          .from('concepts')
          .select('id, name')
          .in('id', conceptIds)

        fadingConcepts = (fadingMastery ?? [])
          .map((m) => {
            const concept = concepts?.find((c) => c.id === m.concept_id)
            if (!concept) return null
            return {
              id: concept.id as string,
              name: concept.name as string,
              masteryLevel: m.mastery_level as number,
            }
          })
          .filter((c): c is NonNullable<typeof c> => c !== null)
      }

      // Study streak: consecutive days with study_plans
      const { data: recentPlans } = await ctx.supabase
        .from('study_plans')
        .select('date')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(30)

      let studyStreakDays = 0
      if (recentPlans?.length) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        let checkDate = new Date(today)

        for (const plan of recentPlans) {
          const planDate = new Date(plan.date as string)
          planDate.setHours(0, 0, 0, 0)

          if (planDate.getTime() === checkDate.getTime()) {
            studyStreakDays++
            checkDate.setDate(checkDate.getDate() - 1)
          } else {
            break
          }
        }
      }

      return {
        dueFlashcards: dueFlashcards ?? 0,
        fadingConcepts,
        studyStreakDays,
      }
    }),
})

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

export interface PlanItem {
  type: string
  resourceId: string
  resourceType: string
  estimatedMinutes: number
  completed: boolean
  workspaceId?: string
}

/**
 * Build a simple study plan from mastery + due flashcards + incomplete lessons.
 * Returns up to 5 items prioritized by: due flashcards > low mastery concepts > new lessons.
 */
async function buildStudyPlanItems(
  supabase: SupabaseClient,
  userId: string,
  workspaceId?: string,
): Promise<PlanItem[]> {
  const items: PlanItem[] = []

  // 1. Due flashcards
  let workspaceIds: string[] = []
  if (workspaceId) {
    workspaceIds = [workspaceId]
  } else {
    const { data: workspaces } = await supabase
      .from('workspaces')
      .select('id')
      .eq('user_id', userId)
      .limit(25)
    workspaceIds = (workspaces ?? []).map((w) => w.id as string)
  }

  if (workspaceIds.length > 0) {
    const { data: dueSets } = await supabase
      .from('flashcard_sets')
      .select(
        `id, title, workspace_id,
         flashcards!inner(id, due_at)`,
      )
      .in('workspace_id', workspaceIds)
      .lte('flashcards.due_at', new Date().toISOString())
      .limit(3)

    if (dueSets?.length) {
      items.push({
        type: 'flashcard_review',
        resourceId: dueSets[0]?.id ?? '',
        resourceType: 'flashcard_set',
        estimatedMinutes: Math.min(10, dueSets.length * 2),
        completed: false,
        workspaceId: dueSets[0]?.workspace_id as string,
      })
    }
  }

  // 2. Incomplete lessons (workspace scoped if given)
  let lessonsQuery = supabase
    .from('lessons')
    .select('id, title, workspace_id')
    .eq('user_id', userId)
    .eq('is_completed', false)
    .limit(3)

  if (workspaceId) {
    lessonsQuery = lessonsQuery.eq('workspace_id', workspaceId)
  }

  const { data: incompleteLessons } = await lessonsQuery

  for (const lesson of incompleteLessons ?? []) {
    if (items.length >= 5) break
    items.push({
      type: 'lesson',
      resourceId: lesson.id,
      resourceType: 'lesson',
      estimatedMinutes: 15,
      completed: false,
      workspaceId: lesson.workspace_id as string,
    })
  }

  return items.slice(0, 5)
}

/**
 * Compute a simple readiness score: average mastery_level across all concepts in workspace.
 */
async function computeReadinessScore(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<number> {
  const { data: mastery } = await supabase
    .from('mastery_records')
    .select('mastery_level')
    .eq('workspace_id', workspaceId)

  if (!mastery?.length) return 0

  const avg =
    mastery.reduce((sum, r) => sum + ((r.mastery_level as number) ?? 0), 0) / mastery.length
  return Math.min(1, Math.max(0, avg))
}

export const studyPlanRouter = createTRPCRouter({
  /**
   * Get today's study plan. If none exists, generate one.
   */
  getToday: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)
      if (input.workspaceId) {
        await resolveWorkspace(ctx.supabase, input.workspaceId, userId)
      }
      const today = new Date().toISOString().split('T')[0]

      // Look for existing plan
      let query = ctx.supabase
        .from('study_plans')
        .select('id, items, exam_date, readiness_score, date')
        .eq('user_id', userId)
        .eq('date', today)
        .order('generated_at', { ascending: false })
        .limit(1)

      if (input.workspaceId) {
        query = query.eq('workspace_id', input.workspaceId)
      }

      const { data: existing } = await query.maybeSingle()

      if (existing) {
        return {
          id: existing.id as string,
          items: (existing.items as PlanItem[]) ?? [],
          examDate: existing.exam_date as string | null,
          readinessScore: existing.readiness_score as number | null,
          date: existing.date as string,
        }
      }

      // Generate new plan
      const items = await buildStudyPlanItems(ctx.supabase, userId, input.workspaceId)
      const readinessScore = input.workspaceId
        ? await computeReadinessScore(ctx.supabase, input.workspaceId)
        : null

      const insertData: Record<string, unknown> = {
        user_id: userId,
        date: today,
        items,
        readiness_score: readinessScore,
        generated_at: new Date().toISOString(),
      }
      if (input.workspaceId) insertData.workspace_id = input.workspaceId

      const { data: plan, error } = await ctx.supabase
        .from('study_plans')
        .insert(insertData)
        .select('id, items, exam_date, readiness_score, date')
        .single()

      if (error || !plan) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

      return {
        id: plan.id as string,
        items: (plan.items as PlanItem[]) ?? [],
        examDate: plan.exam_date as string | null,
        readinessScore: plan.readiness_score as number | null,
        date: plan.date as string,
      }
    }),

  /**
   * Set or update the exam date for today's plan.
   */
  setExamDate: protectedProcedure
    .input(
      z.object({
        examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        workspaceId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)
      if (input.workspaceId) {
        await resolveWorkspace(ctx.supabase, input.workspaceId, userId)
      }
      const today = new Date().toISOString().split('T')[0]

      // Check if plan exists for today
      let existingQuery = ctx.supabase
        .from('study_plans')
        .select('id')
        .eq('user_id', userId)
        .eq('date', today)
        .limit(1)
      if (input.workspaceId) existingQuery = existingQuery.eq('workspace_id', input.workspaceId)
      const { data: existing } = await existingQuery.maybeSingle()

      let planId: string
      if (existing) {
        const { error } = await ctx.supabase
          .from('study_plans')
          .update({ exam_date: input.examDate, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
        planId = existing.id as string
      } else {
        const insertData: Record<string, unknown> = {
          user_id: userId,
          date: today,
          exam_date: input.examDate,
          items: [],
          generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        if (input.workspaceId) insertData.workspace_id = input.workspaceId
        const { data: plan, error } = await ctx.supabase
          .from('study_plans')
          .insert(insertData)
          .select('id')
          .single()
        if (error || !plan) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
        planId = plan.id as string
      }

      return { examDate: input.examDate, planId }
    }),

  /**
   * Get the current readiness score for a workspace.
   */
  getReadinessScore: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)
      await resolveWorkspace(ctx.supabase, input.workspaceId, userId)
      const score = await computeReadinessScore(ctx.supabase, input.workspaceId)
      return { readinessScore: score }
    }),

  /**
   * Mark a plan item as complete.
   */
  markItemComplete: protectedProcedure
    .input(z.object({ planId: z.string().uuid(), itemIndex: z.number().int().min(0) }))
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)

      const { data: plan } = await ctx.supabase
        .from('study_plans')
        .select('id, items')
        .eq('id', input.planId)
        .eq('user_id', userId)
        .single()

      if (!plan) throw new TRPCError({ code: 'NOT_FOUND', message: 'Plan not found' })

      const items = (plan.items as PlanItem[]) ?? []
      if (input.itemIndex >= items.length)
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid item index' })

      items[input.itemIndex] = { ...items[input.itemIndex]!, completed: true }

      const { error } = await ctx.supabase
        .from('study_plans')
        .update({ items, updated_at: new Date().toISOString() })
        .eq('id', input.planId)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

      return { success: true }
    }),
})

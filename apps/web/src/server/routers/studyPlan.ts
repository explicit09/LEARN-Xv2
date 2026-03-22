import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import type { PlanItem } from '@/lib/study-plan/types'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import {
  resolveUserId,
  resolveWorkspace,
  buildStudyPlanItems,
  computeReadinessScore,
} from './studyPlan-helpers'

export type { PlanItem } from '@/lib/study-plan/types'
export { markPlanItemByResource } from './studyPlan-helpers'

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
        const items = (existing.items as PlanItem[]) ?? []
        // Hydrate missing titles for lesson items
        const needTitle = items.filter((i) => i.type === 'lesson' && !i.title)
        if (needTitle.length > 0) {
          const ids = needTitle.map((i) => i.resourceId)
          const { data: lessons } = await ctx.supabase
            .from('lessons')
            .select('id, title')
            .in('id', ids)
          const titleMap = new Map((lessons ?? []).map((l) => [l.id as string, l.title as string]))
          for (const item of items) {
            if (item.type === 'lesson' && !item.title) {
              item.title = titleMap.get(item.resourceId) ?? 'Lesson'
            }
          }
        }
        return {
          id: existing.id as string,
          items,
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

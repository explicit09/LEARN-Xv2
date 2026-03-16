import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'

import { createTRPCRouter, protectedProcedure } from '../trpc'

async function resolveUserId(supabase: SupabaseClient, authId: string): Promise<string> {
  const { data, error } = await supabase.from('users').select('id').eq('auth_id', authId).single()
  if (error || !data) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
  return data.id as string
}

export const analyticsRouter = createTRPCRouter({
  getDashboard: protectedProcedure.query(async ({ ctx }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)

    // Recent workspaces (last 5 updated)
    const { data: workspaces } = await ctx.supabase
      .from('workspaces')
      .select('id, name, status, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(5)

    // Total concepts mastered (mastery_level > 0.7)
    const { data: mastered } = await ctx.supabase
      .from('mastery_records')
      .select('id')
      .eq('user_id', userId)
      .gt('mastery_level', 0.7)

    // Total completed lessons
    const { data: completedLessons } = await ctx.supabase
      .from('lessons')
      .select('id, time_spent_seconds')
      .eq('user_id', userId)
      .eq('is_completed', true)

    const totalStudyMinutes = Math.round(
      (completedLessons ?? []).reduce(
        (sum, l) => sum + ((l.time_spent_seconds as number) ?? 0),
        0,
      ) / 60,
    )

    // Study streak: count consecutive days with activity
    const { data: recentPlans } = await ctx.supabase
      .from('study_plans')
      .select('date')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(30)

    let studyStreak = 0
    if (recentPlans?.length) {
      const today = new Date()
      for (let i = 0; i < recentPlans.length; i++) {
        const planDate = new Date(recentPlans[i]!.date as string)
        const expectedDate = new Date(today)
        expectedDate.setDate(expectedDate.getDate() - i)
        if (planDate.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) {
          studyStreak++
        } else {
          break
        }
      }
    }

    return {
      recentWorkspaces: (workspaces ?? []).map((w) => ({
        id: w.id as string,
        name: w.name as string,
        status: w.status as string,
        updatedAt: w.updated_at as string,
      })),
      studyStreak,
      totalStudyMinutes,
      totalConceptsMastered: mastered?.length ?? 0,
      totalLessonsCompleted: completedLessons?.length ?? 0,
    }
  }),

  getStudyHeatmap: protectedProcedure
    .input(z.object({ year: z.number().int().optional() }))
    .query(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)
      const year = input.year ?? new Date().getFullYear()
      const startDate = `${year}-01-01`
      const endDate = `${year}-12-31`

      // Get completed lessons grouped by date
      const { data: lessons } = await ctx.supabase
        .from('lessons')
        .select('completed_at, time_spent_seconds')
        .eq('user_id', userId)
        .eq('is_completed', true)
        .gte('completed_at', startDate)
        .lte('completed_at', endDate)

      // Get flashcard reviews grouped by date
      const { data: reviews } = await ctx.supabase
        .from('flashcard_reviews')
        .select('created_at, review_duration_ms')
        .eq('user_id', userId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)

      // Aggregate by date
      const dayMap = new Map<string, number>()

      for (const l of lessons ?? []) {
        const date = (l.completed_at as string)?.split('T')[0]
        if (!date) continue
        const mins = Math.round(((l.time_spent_seconds as number) ?? 15) / 60)
        dayMap.set(date, (dayMap.get(date) ?? 0) + mins)
      }

      for (const r of reviews ?? []) {
        const date = (r.created_at as string)?.split('T')[0]
        if (!date) continue
        const mins = Math.round(((r.review_duration_ms as number) ?? 2000) / 60000)
        dayMap.set(date, (dayMap.get(date) ?? 0) + mins)
      }

      return Array.from(dayMap.entries())
        .map(([date, minutes]) => ({ date, minutes }))
        .sort((a, b) => a.date.localeCompare(b.date))
    }),
})

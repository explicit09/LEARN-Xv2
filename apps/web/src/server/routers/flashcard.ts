import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { rateCard } from '@learn-x/utils'
import {
  getDueFlashcardsSchema,
  getFlashcardSetSchema,
  submitReviewSchema,
} from '@learn-x/validators'

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
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .eq('user_id', userId)
    .single()
  if (!workspace) throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace not found' })
  return workspace.id
}

export const flashcardRouter = createTRPCRouter({
  generate: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)
      await resolveWorkspace(ctx.supabase, input.workspaceId, userId)

      try {
        const { tasks } = await import('@trigger.dev/sdk/v3')
        await tasks.trigger('generate-flashcards', { workspaceId: input.workspaceId })
      } catch {
        // Trigger.dev not available in all environments — best effort
      }

      return { started: true }
    }),

  listSets: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)
      await resolveWorkspace(ctx.supabase, input.workspaceId, userId)

      const { data } = await ctx.supabase
        .from('flashcard_sets')
        .select('id, workspace_id, lesson_id, title, source_type, created_at, updated_at')
        .eq('workspace_id', input.workspaceId)
        .order('created_at', { ascending: false })

      return data ?? []
    }),

  getSet: protectedProcedure.input(getFlashcardSetSchema).query(async ({ ctx, input }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)
    await resolveWorkspace(ctx.supabase, input.workspaceId, userId)

    const { data: set } = await ctx.supabase
      .from('flashcard_sets')
      .select('id, workspace_id, lesson_id, title, source_type, created_at')
      .eq('id', input.id)
      .eq('workspace_id', input.workspaceId)
      .single()
    if (!set) throw new TRPCError({ code: 'NOT_FOUND', message: 'Flashcard set not found' })

    const { data: cards } = await ctx.supabase
      .from('flashcards')
      .select('id, front, back, concept_id, stability, difficulty, due_at, reps, lapses, state')
      .eq('set_id', input.id)

    return { ...set, cards: cards ?? [] }
  }),

  getDue: protectedProcedure.input(getDueFlashcardsSchema).query(async ({ ctx, input }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)
    await resolveWorkspace(ctx.supabase, input.workspaceId, userId)

    const { data, error } = await ctx.supabase.rpc('get_due_flashcards', {
      p_workspace_id: input.workspaceId,
      p_limit: input.limit ?? 20,
    })

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  submitReview: protectedProcedure.input(submitReviewSchema).mutation(async ({ ctx, input }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)

    const { data: card } = await ctx.supabase
      .from('flashcards')
      .select('id, set_id, stability, difficulty, due_at, reps, lapses, state, last_review')
      .eq('id', input.cardId)
      .single()
    if (!card) throw new TRPCError({ code: 'NOT_FOUND', message: 'Flashcard not found' })

    // Verify ownership via set → workspace
    const { data: set } = await ctx.supabase
      .from('flashcard_sets')
      .select('workspace_id')
      .eq('id', card.set_id)
      .single()
    if (!set) throw new TRPCError({ code: 'NOT_FOUND', message: 'Flashcard set not found' })

    await resolveWorkspace(ctx.supabase, set.workspace_id, userId)

    const now = new Date()
    const prevLastReview = card.last_review ? new Date(card.last_review) : now
    const elapsedDays = (now.getTime() - prevLastReview.getTime()) / (1000 * 60 * 60 * 24)

    const fsrsCard = {
      due: card.due_at ? new Date(card.due_at) : now,
      stability: card.stability ?? 0,
      difficulty: card.difficulty ?? 0,
      elapsed_days: elapsedDays,
      scheduled_days: 0,
      reps: card.reps ?? 0,
      lapses: card.lapses ?? 0,
      state: card.state ?? 0,
      last_review: prevLastReview,
    }

    const nextCard = rateCard(
      fsrsCard as Parameters<typeof rateCard>[0],
      input.rating as 1 | 2 | 3 | 4,
    )

    const scheduledDays = (nextCard.due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

    await ctx.supabase
      .from('flashcards')
      .update({
        stability: nextCard.stability,
        difficulty: nextCard.difficulty,
        due_at: nextCard.due.toISOString(),
        reps: nextCard.reps,
        lapses: nextCard.lapses,
        state: nextCard.state,
        last_review: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', input.cardId)

    const { data: review, error } = await ctx.supabase
      .from('flashcard_reviews')
      .insert({
        flashcard_id: input.cardId,
        user_id: userId,
        rating: input.rating,
        elapsed_days: elapsedDays,
        scheduled_days: scheduledDays,
      })
      .select('id, rating, reviewed_at')
      .single()

    if (error || !review)
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message })

    return {
      ...review,
      nextDue: nextCard.due.toISOString(),
      scheduledDays,
    }
  }),
})

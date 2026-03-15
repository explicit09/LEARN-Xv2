import { TRPCError } from '@trpc/server'

import { updateProfileSchema, upsertPersonaSchema } from '@learn-x/validators'

import { createTRPCRouter, protectedProcedure } from '../trpc'

export const userRouter = createTRPCRouter({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const { data: user, error } = await ctx.supabase
      .from('users')
      .select('*')
      .eq('auth_id', ctx.user.id)
      .single()
    if (error || !user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User profile not found' })
    return user
  }),

  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (input.displayName !== undefined) update.display_name = input.displayName
      if (input.avatarUrl !== undefined) update.avatar_url = input.avatarUrl

      const { data: user, error } = await ctx.supabase
        .from('users')
        .update(update)
        .eq('auth_id', ctx.user.id)
        .select()
        .single()
      if (error || !user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      return user
    }),

  upsertPersona: protectedProcedure
    .input(upsertPersonaSchema)
    .mutation(async ({ ctx, input }) => {
      const { data: user, error: userError } = await ctx.supabase
        .from('users')
        .select('id')
        .eq('auth_id', ctx.user.id)
        .single()
      if (userError || !user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })

      const { data: persona, error } = await ctx.supabase
        .from('personas')
        .upsert(
          {
            user_id: user.id,
            version: 1,
            interests: input.interests,
            motivational_style: input.motivationalStyle,
            tone_preference: input.tonePreference,
            difficulty_preference: input.difficultyPreference,
            aspiration_tags: input.aspirationTags ?? [],
            affinity_domains: input.affinityDomains ?? [],
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,version' },
        )
        .select()
        .single()
      if (error || !persona) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      return persona
    }),

  completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    const { data: user, error } = await ctx.supabase
      .from('users')
      .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
      .eq('auth_id', ctx.user.id)
      .select()
      .single()
    if (error || !user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
    return user
  }),
})

import { TRPCError } from '@trpc/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function resolveUserId(supabase: SupabaseClient, authId: string): Promise<string> {
  const { data: user, error } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', authId)
    .single()
  if (error || !user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
  return user.id as string
}

export async function resolveOrCreateInstructorProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data: existing } = await supabase
    .from('instructor_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) return existing.id as string

  const { data: profile, error } = await supabase
    .from('instructor_profiles')
    .insert({ user_id: userId })
    .select('id')
    .single()

  if (error || !profile) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
  return profile.id as string
}

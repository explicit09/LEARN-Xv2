import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient, User } from '@supabase/supabase-js'

// Lazy-initialized to avoid calling createClient at module load time,
// which would throw during Next.js build when env vars are placeholder values.
let _supabaseAdmin: SupabaseClient | null = null
function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }
  return _supabaseAdmin
}

export interface TRPCContext {
  supabase: SupabaseClient
  user: User | null
  headers: Headers
}

export async function createTRPCContext(opts: {
  headers: Headers
  user?: User | null
}): Promise<TRPCContext> {
  return {
    supabase: getSupabaseAdmin(),
    user: opts.user ?? null,
    headers: opts.headers,
  }
}

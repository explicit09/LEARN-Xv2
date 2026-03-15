import { createClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export interface TRPCContext {
  supabase: typeof supabaseAdmin
  user: User | null
  headers: Headers
}

export async function createTRPCContext(opts: {
  headers: Headers
  user?: User | null
}): Promise<TRPCContext> {
  return {
    supabase: supabaseAdmin,
    user: opts.user ?? null,
    headers: opts.headers,
  }
}

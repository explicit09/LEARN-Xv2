import { createCallerFactory } from '@/server/trpc'
import { appRouter } from '@/server/routers/_app'
import { createTRPCContext } from '@/server/context'
import { createClient } from '@/lib/supabase/server'

export async function createServerCaller() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const ctx = await createTRPCContext({ headers: new Headers(), user })
  return createCallerFactory(appRouter)(ctx)
}

import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import type { NextRequest } from 'next/server'

// Prevent Next.js from statically evaluating this route at build time —
// it uses cookies() and env vars that are only available at request time.
export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { appRouter } from '@/server/routers/_app'
import { createTRPCContext } from '@/server/context'

const handler = async (req: NextRequest) => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ headers: req.headers, user }),
  })
}

export { handler as GET, handler as POST }

/**
 * Test context helpers for contract tests.
 * Requires supabase start running locally.
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

interface TestContextOptions {
  authenticated: boolean
  skipUserRow?: boolean
}

export async function createTestContext(opts: TestContextOptions) {
  if (!opts.authenticated) {
    return { supabase: serviceClient, user: null, headers: new Headers() }
  }

  // Create a test auth user via service role
  const email = `test-${Date.now()}@example.com`
  const password = 'test-password-123'

  const { data: authData, error } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error ?? !authData.user) throw new Error(`Failed to create test user: ${error?.message}`)

  const authUser = authData.user

  if (opts.skipUserRow) {
    // Delete the users row that handle_new_user trigger created
    await serviceClient.from('users').delete().eq('auth_id', authUser.id)
  }

  return {
    supabase: serviceClient,
    user: authUser,
    headers: new Headers(),
    // Cleanup: caller should delete the auth user after the test
    _cleanup: async () => {
      await serviceClient.auth.admin.deleteUser(authUser.id)
    },
  }
}

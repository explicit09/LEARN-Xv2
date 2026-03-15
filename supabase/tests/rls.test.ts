/**
 * RLS integration tests.
 * Requires: supabase start (local Supabase running on port 54321)
 *
 * Run: pnpm test:integration (from root)
 */
import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Test users
let userAId: string
let userBId: string
let userAClient: ReturnType<typeof createClient>
let userBClient: ReturnType<typeof createClient>

const userAEmail = `rls-test-a-${Date.now()}@example.com`
const userBEmail = `rls-test-b-${Date.now()}@example.com`
const password = 'test-password-123'

beforeAll(async () => {
  // Create two test users
  const { data: a } = await serviceClient.auth.admin.createUser({
    email: userAEmail,
    password,
    email_confirm: true,
  })
  const { data: b } = await serviceClient.auth.admin.createUser({
    email: userBEmail,
    password,
    email_confirm: true,
  })
  userAId = a.user!.id
  userBId = b.user!.id

  // Sign in as each user
  const { data: sessionA } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY).auth.signInWithPassword(
    { email: userAEmail, password },
  )
  const { data: sessionB } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY).auth.signInWithPassword(
    { email: userBEmail, password },
  )

  userAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${sessionA.session!.access_token}` } },
  })
  userBClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${sessionB.session!.access_token}` } },
  })
})

afterAll(async () => {
  await serviceClient.auth.admin.deleteUser(userAId)
  await serviceClient.auth.admin.deleteUser(userBId)
})

describe('users table RLS', () => {
  it('unauthenticated user cannot SELECT from users', async () => {
    const { data, error } = await anonClient.from('users').select('*')
    // RLS: returns empty set or error, never another user's data
    expect(data?.length ?? 0).toBe(0)
  })

  it('user A can read their own row', async () => {
    const { data, error } = await userAClient.from('users').select('*').eq('auth_id', userAId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0]!.auth_id).toBe(userAId)
  })

  it('user A cannot read user B row', async () => {
    const { data } = await userAClient.from('users').select('*').eq('auth_id', userBId)
    expect(data).toHaveLength(0)
  })
})

describe('workspaces table RLS', () => {
  let workspaceAId: string

  it('user A can create a workspace', async () => {
    // Get user A's users.id (not auth_id)
    const { data: userRow } = await userAClient.from('users').select('id').eq('auth_id', userAId).single()
    const { data, error } = await userAClient
      .from('workspaces')
      .insert({ user_id: userRow!.id, name: 'Test Workspace A' })
      .select()
      .single()
    expect(error).toBeNull()
    expect(data).toBeDefined()
    workspaceAId = data!.id
  })

  it('user B cannot see user A workspace', async () => {
    const { data } = await userBClient.from('workspaces').select('*').eq('id', workspaceAId)
    expect(data).toHaveLength(0)
  })

  it('unauthenticated user cannot see any workspaces', async () => {
    const { data } = await anonClient.from('workspaces').select('*')
    expect(data?.length ?? 0).toBe(0)
  })
})

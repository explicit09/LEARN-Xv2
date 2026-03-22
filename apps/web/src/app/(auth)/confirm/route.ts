import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type') as 'signup' | 'email' | null
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  if (token_hash && type) {
    const supabase = await createClient()
    await supabase.auth.verifyOtp({ token_hash, type })
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin))
}

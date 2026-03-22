'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@learn-x/ui'
import { Input } from '@learn-x/ui'
import { createClient } from '@/lib/supabase/client'

export function RegisterForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } },
    })
    setLoading(false)
    if (authError) {
      setError(authError.message)
      return
    }
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
        Check your email for a verification link to complete registration.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          Full name
        </label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Alice Smith"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          minLength={8}
          required
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  )
}

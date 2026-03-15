import Link from 'next/link'
import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to continue learning</p>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          No account?{' '}
          <Link href="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}

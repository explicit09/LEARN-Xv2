import Link from 'next/link'

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <svg className="h-6 w-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Check your email</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a verification link. Click it to activate your account, then come back to sign in.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  )
}

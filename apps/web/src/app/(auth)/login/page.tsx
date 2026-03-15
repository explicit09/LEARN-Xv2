import Link from 'next/link'
import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — marketing */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-[hsl(222,47%,7%)] p-12 text-white">
        <div>
          <span className="text-lg font-semibold tracking-tight text-white">LEARN-X</span>
        </div>

        <div className="space-y-10">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white">
              Your course materials,
              <br />
              finally working
              <br />
              for you.
            </h1>
            <p className="text-base text-[hsl(214,32%,65%)] leading-relaxed max-w-sm">
              Upload any document. Get a personalized study system — lessons, quizzes, flashcards,
              and mastery tracking — built around how you actually learn.
            </p>
          </div>

          {/* Testimonial */}
          <div className="rounded-xl border border-[hsl(215,35%,18%)] bg-[hsl(222,38%,11%)] p-5 space-y-3">
            <p className="text-sm text-[hsl(214,32%,75%)] leading-relaxed">
              &ldquo;I uploaded my entire ML textbook and had a personalized study plan in minutes.
              The FSRS scheduling actually keeps me on track.&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-[hsl(221,83%,53%)] flex items-center justify-center text-xs font-semibold text-white">
                SL
              </div>
              <div>
                <p className="text-sm font-medium text-white">Sara L.</p>
                <p className="text-xs text-[hsl(215,20%,55%)]">PhD student, Computer Science</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-8">
            <div>
              <p className="text-2xl font-bold text-white">20–30%</p>
              <p className="text-xs text-[hsl(215,20%,55%)] mt-0.5">fewer reviews needed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">FSRS-6</p>
              <p className="text-xs text-[hsl(215,20%,55%)] mt-0.5">scheduling algorithm</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-[hsl(215,20%,45%)]">© 2025 LEARN-X · Privacy · Terms</p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center bg-[hsl(222,38%,9%)] p-8">
        <div className="w-full max-w-sm space-y-6">
          {/* Mobile logo */}
          <div className="lg:hidden text-center">
            <span className="text-xl font-semibold tracking-tight">LEARN-X</span>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground">Sign in to continue learning</p>
          </div>

          <LoginForm />

          <p className="text-center text-sm text-muted-foreground">
            No account?{' '}
            <Link
              href="/register"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

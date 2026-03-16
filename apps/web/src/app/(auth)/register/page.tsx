import Link from 'next/link'
import { RegisterForm } from '@/components/auth/RegisterForm'

export default function RegisterPage() {
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
              Turn any document
              <br />
              into a personalized
              <br />
              study system.
            </h1>
            <p className="text-base text-[hsl(214,32%,65%)] leading-relaxed max-w-sm">
              LEARN-X builds lessons, quizzes, and flashcards around your material — adapting to how
              you learn with FSRS-6 spaced repetition.
            </p>
          </div>

          <div className="space-y-3">
            {[
              'Upload PDFs, slides, or notes',
              'Get auto-generated lessons tailored to you',
              'Master concepts with spaced repetition',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full bg-[hsl(221,83%,53%)] flex items-center justify-center flex-shrink-0">
                  <svg
                    className="h-3 w-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <span className="text-sm text-[hsl(214,32%,75%)]">{feature}</span>
              </div>
            ))}
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
            <h2 className="text-2xl font-semibold tracking-tight">Create your account</h2>
            <p className="text-sm text-muted-foreground">Free forever · No credit card needed</p>
          </div>

          <RegisterForm />

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

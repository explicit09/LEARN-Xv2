'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { LoginForm } from '@/components/auth/LoginForm'
import { AnimatedHeroMockup } from '@/components/marketing/AnimatedHeroMockup'

export default function LoginPage() {
  return (
    <main className="dark bg-background text-foreground min-h-screen relative overflow-hidden flex">
      {/* Global Aurora Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <motion.div
          animate={{ x: [-20, 20, -20], y: [-20, 20, -20] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/15 blur-[140px] rounded-full mix-blend-screen"
        />
        <motion.div
          animate={{ x: [20, -20, 20], y: [20, -20, 20] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute top-[30%] right-[-10%] w-[50%] h-[50%] bg-purple-600/15 blur-[140px] rounded-full mix-blend-screen"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px] opacity-20 mask-image-[radial-gradient(ellipse_at_center,black_50%,transparent_100%)]" />
      </div>

      {/* Left panel — Hero & Proof */}
      <div className="relative z-10 hidden lg:flex lg:w-[55%] flex-col justify-center px-12 xl:px-20 border-r border-surface-border-strong bg-background/60 backdrop-blur-3xl">
        <Link href="/" className="absolute top-8 left-12 transition-opacity hover:opacity-70">
          <Image
            src="/brand/logo.svg"
            alt="LEARN-X Logo"
            width={700}
            height={160}
            className="h-40 w-auto brightness-0 invert opacity-90"
            priority
          />
        </Link>

        <div className="max-w-xl mx-auto w-full">
          <h1 className="text-4xl xl:text-5xl font-[family:var(--font-display)] font-bold tracking-tight text-foreground mb-4 leading-[1.1]">
            One concept. <br />
            <span className="text-muted-foreground">Explained the way you understand it.</span>
          </h1>
          <p className="text-lg text-foreground/80 mb-12">
            Join LEARN-X and see how the same concept changes depending on how you learn.
          </p>

          <div className="w-full transform xl:scale-105 origin-left">
            <AnimatedHeroMockup />
          </div>
        </div>
      </div>

      {/* Right panel — Form */}
      <div className="relative z-10 flex flex-1 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <Link href="/" className="inline-block transition-opacity hover:opacity-70">
              <Image
                src="/brand/logo.svg"
                alt="LEARN-X Logo"
                width={700}
                height={160}
                className="h-24 sm:h-32 w-auto brightness-0 invert opacity-90 mx-auto"
                priority
              />
            </Link>
          </div>

          <div className="glass-card spatial-surface rounded-[2rem] p-8 border border-surface-border shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="spatial-surface-glow opacity-30" />
            <div className="relative z-10 space-y-6">
              <div className="space-y-1.5 text-center">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  Welcome back
                </h2>
                <p className="text-sm text-muted-foreground">Sign in to continue learning</p>
              </div>

              <LoginForm />

              <p className="text-center text-sm text-foreground/70">
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
      </div>
    </main>
  )
}

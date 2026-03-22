'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowUpRight, Split, Waypoints, Target } from 'lucide-react'

import { Button } from '@learn-x/ui'

import { AnimatedHeroMockup } from './AnimatedHeroMockup'

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      delay,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
}

const features = [
  {
    title: 'Explained differently',
    copy: 'Same concept, taught in a way that clicks for you.',
    icon: Split,
    color: 'from-blue-500/20 to-indigo-500/20',
    iconColor: 'text-blue-400',
  },
  {
    title: 'Adapts as you go',
    copy: 'Gets simpler or deeper based on what you understand.',
    icon: Waypoints,
    color: 'from-purple-500/20 to-fuchsia-500/20',
    iconColor: 'text-purple-400',
  },
  {
    title: 'Focuses where you struggle',
    copy: 'Practice built around your weak spots, not everything.',
    icon: Target,
    color: 'from-orange-500/20 to-red-500/20',
    iconColor: 'text-orange-400',
  },
]

export function LandingPage() {
  return (
    <main className="dark bg-background text-foreground selection:bg-primary/30 min-h-screen relative overflow-x-hidden">
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

      {/* Header */}
      <header className="absolute inset-x-0 top-0 z-50">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 md:px-12">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-70">
            <Image
              src="/brand/logo.svg"
              alt="LEARN-X Logo"
              width={700}
              height={160}
              className="h-40 w-auto brightness-0 invert opacity-90"
              priority
            />
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Log in
            </Link>
            <Button
              asChild
              className="h-9 rounded-full bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 hover:border-primary/40 transition-all font-medium text-sm px-5"
            >
              <Link href="/register">Start free</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* 1. HERO SECTION (PAGE 1) */}
      <section className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-7xl flex-col justify-center px-6 pt-32 pb-20 md:px-12 md:pt-40">
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-8 items-center">
          {/* Left Text Column */}
          <motion.div
            initial="hidden"
            animate="visible"
            className="max-w-xl mx-auto lg:mx-0 text-center lg:text-left"
          >
            <motion.h1
              variants={fadeUp}
              custom={0}
              className="font-[family:var(--font-display)] text-[2.75rem] sm:text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight text-foreground"
            >
              Education wasn’t built for personalization. <br className="hidden sm:block" />
              <span className="text-gradient">LEARN-X is.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={0.1}
              className="mt-6 text-lg sm:text-xl leading-relaxed text-muted-foreground"
            >
              Turn your course materials into lessons, practice, and exam prep automatically.{' '}
              <span className="text-foreground font-medium">
                Learning that adapts to how you understand.
              </span>
            </motion.p>

            <motion.div
              variants={fadeUp}
              custom={0.2}
              className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
            >
              <Button
                asChild
                className="h-14 w-full sm:w-auto rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-8 text-base shadow-[0_0_30px_-5px_hsl(var(--primary)/0.4)] transition-all hover:scale-105 hover:shadow-[0_0_40px_-5px_hsl(var(--primary)/0.6)]"
              >
                <Link href="/register">
                  Start learning
                  <ArrowUpRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-14 w-full sm:w-auto rounded-full border-surface-border-strong bg-background/50 backdrop-blur-sm px-8 text-base hover:bg-surface-soft hover:text-foreground transition-colors"
              >
                <Link href="#how-it-works">See how it works</Link>
              </Button>
            </motion.div>

            <motion.div
              variants={fadeUp}
              custom={0.3}
              className="mt-10 pt-6 border-t border-surface-border-strong/50"
            >
              <p className="text-base text-foreground/80 font-medium">
                Students don’t struggle because they’re slow. <br />
                <span className="text-muted-foreground">
                  They struggle because they’re mismatched.
                </span>
              </p>
            </motion.div>
          </motion.div>

          {/* Right Floating Animated Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotateY: -15, rotateX: 5 }}
            animate={{ opacity: 1, scale: 1, rotateY: -5, rotateX: 2 }}
            transition={{ duration: 1, delay: 0.2, type: 'spring', bounce: 0.4 }}
            className="w-full flex justify-center items-center"
          >
            <AnimatedHeroMockup />
          </motion.div>
        </div>
      </section>

      {/* 2. DIFFERENTIATION SECTION (PAGE 2) */}
      <section
        id="how-it-works"
        className="relative z-10 border-t border-border/40 bg-background/40 backdrop-blur-xl px-6 py-24 md:px-12 md:py-32"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="font-[family:var(--font-display)] text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight mb-5">
              One concept. <br />
              <span className="text-muted-foreground">Explained the way you understand it.</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              See how the same concept changes depending on how you learn.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.5, delay: index * 0.15 }}
                  className="glass-card surface-card-hover group relative overflow-hidden rounded-3xl p-8 text-center flex flex-col items-center"
                >
                  <div
                    className={`absolute -inset-px opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-gradient-to-br ${feature.color}`}
                  />
                  <div className="relative z-10 flex flex-col items-center h-full w-full">
                    <div className="h-16 w-16 rounded-2xl border border-surface-border bg-surface flex items-center justify-center mb-6 shadow-sm">
                      <Icon className={`h-8 w-8 ${feature.iconColor}`} />
                    </div>
                    <h3 className="text-2xl font-bold tracking-tight text-foreground mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-lg font-medium text-muted-foreground/90">{feature.copy}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center mb-16"
          >
            <p className="text-base text-muted-foreground">
              Including examples that match how you think and what you relate to.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <p className="text-2xl sm:text-3xl font-[family:var(--font-display)] font-semibold text-foreground tracking-tight">
              Not just answers. <br />
              <span className="text-gradient">Understanding.</span>
            </p>
          </motion.div>
        </div>
      </section>

      {/* 3. SIMPLIFIED BOTTOM CTA */}
      <section className="relative z-10 px-6 py-24 md:px-12 md:py-32">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-5xl"
        >
          <div className="spatial-surface relative overflow-hidden rounded-[3rem] p-10 md:p-20 text-center">
            <div className="spatial-surface-glow opacity-60" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.15),transparent_50%)]" />

            <div className="relative z-10">
              <h2 className="font-[family:var(--font-display)] text-3xl sm:text-5xl font-bold tracking-tight mb-10">
                Stop studying harder. <br className="hidden sm:block" />
                <span className="text-gradient">Start actually understanding.</span>
              </h2>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  asChild
                  className="h-14 w-full sm:w-auto rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-10 text-base shadow-[0_0_30px_-5px_hsl(var(--primary)/0.4)] transition-transform hover:scale-105"
                >
                  <Link href="/register">Get started</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-14 w-full sm:w-auto rounded-full border-surface-border-strong bg-background/50 backdrop-blur-sm px-10 text-base hover:bg-surface-soft hover:text-foreground transition-colors"
                >
                  <Link href="/login">Sign in</Link>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </section>
    </main>
  )
}

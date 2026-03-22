'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  LineChart,
  ListOrdered,
  CarFront,
  CheckCircle2,
  Sparkles,
  UserSearch,
} from 'lucide-react'

// Animation phases:
// 0: Hook - "How do you understand best?" + 3 options
// 1: Selection - Highlight "Visual"
// 2: Transform - "Concept: Derivatives" + Visual Graph
// 3: Adapt - Rapid switch to Logical -> Analogy
// 4: Lock-in - Back to Visual + "This is how you understand it."
const PHASES = [0, 1, 2, 3, 4] as const

export function AnimatedHeroMockup() {
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [adaptSubPhase, setAdaptSubPhase] = useState(0) // Used in phase 3 for rapid switching

  useEffect(() => {
    let timeout: NodeJS.Timeout

    // Timing logic - SLOWED DOWN for better readability
    if (phaseIndex === 0) timeout = setTimeout(() => setPhaseIndex(1), 3000) // Hook reads
    if (phaseIndex === 1) timeout = setTimeout(() => setPhaseIndex(2), 2000) // Selection glow
    if (phaseIndex === 2) timeout = setTimeout(() => setPhaseIndex(3), 3500) // Visual graph draws

    if (phaseIndex === 3) {
      // Switching through the sub-phases: Logical, then Analogy, then move to Phase 4
      if (adaptSubPhase === 0) {
        timeout = setTimeout(() => {
          setAdaptSubPhase(1)
        }, 3500) // Logical view (3.5s to read the steps)
      } else if (adaptSubPhase === 1) {
        timeout = setTimeout(() => {
          setAdaptSubPhase(0)
          setPhaseIndex(4)
        }, 4500) // Analogy view (4.5s to read the paragraph before ending)
      }
    }

    if (phaseIndex === 4) timeout = setTimeout(() => setPhaseIndex(0), 5000) // Lock-in proof

    return () => clearTimeout(timeout)
  }, [phaseIndex, adaptSubPhase])

  // Determine which content to show inside the card
  let activeContent = 'visual'
  if (phaseIndex === 3) {
    activeContent = adaptSubPhase === 0 ? 'logical' : 'analogy'
  } else if (phaseIndex === 4) {
    activeContent = 'visual'
  }

  return (
    <div className="relative w-full aspect-[4/3] max-w-2xl mx-auto perspective-1000">
      <motion.div
        animate={{ y: [-8, 8, -8], rotateY: [-5, -5, -5], rotateX: [2, 2, 2] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="w-full h-full preserve-3d"
      >
        <div className="spatial-surface relative w-full h-full rounded-[2rem] p-4 flex flex-col overflow-hidden">
          <div className="spatial-surface-glow opacity-80" />

          {/* Top Bar Fake UI */}
          <div className="flex items-center justify-between px-4 pb-4 border-b border-surface-border-strong/40 z-10">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-orange-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <div className="text-xs font-semibold tracking-wide text-primary/80 flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full">
              <Sparkles className="w-3 h-3" />
              LEARN-X Engine
            </div>
          </div>

          {/* Dynamic Content Area */}
          <div className="relative flex-1 bg-background/50 rounded-b-[1.5rem] p-6 flex flex-col items-center justify-center overflow-hidden z-10 w-full h-full">
            {/* Phase 0 & 1: The Hook */}
            <AnimatePresence>
              {(phaseIndex === 0 || phaseIndex === 1) && (
                <motion.div
                  key="hook"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -40 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col items-center w-full max-w-md"
                >
                  <div className="bg-primary/20 p-3 rounded-2xl text-primary mb-4">
                    <UserSearch className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-6 text-foreground tracking-tight">
                    How do you understand best?
                  </h3>

                  <div className="flex flex-col gap-3 w-full">
                    {/* Visual Option */}
                    <motion.div
                      animate={{
                        borderColor:
                          phaseIndex === 1 ? 'rgba(59, 130, 246, 0.8)' : 'rgba(59, 130, 246, 0.1)',
                        boxShadow:
                          phaseIndex === 1 ? '0 0 20px -5px rgba(59, 130, 246, 0.4)' : 'none',
                        scale: phaseIndex === 1 ? 1.05 : 1,
                      }}
                      className="flex items-center gap-4 p-4 rounded-xl border border-surface-border bg-surface-soft/50 w-full transition-colors"
                    >
                      <LineChart className="w-5 h-5 text-blue-400" />
                      <span className="font-medium">Visual Graphs & Charts</span>
                      {phaseIndex === 1 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="ml-auto"
                        >
                          <CheckCircle2 className="w-5 h-5 text-blue-500" />
                        </motion.div>
                      )}
                    </motion.div>

                    {/* Logical Option */}
                    <div className="flex items-center gap-4 p-4 rounded-xl border border-surface-border bg-surface-soft/50 w-full opacity-60">
                      <ListOrdered className="w-5 h-5 text-yellow-400" />
                      <span className="font-medium">Step-by-Step Logic</span>
                    </div>

                    {/* Analogy Option */}
                    <div className="flex items-center gap-4 p-4 rounded-xl border border-surface-border bg-surface-soft/50 w-full opacity-60">
                      <CarFront className="w-5 h-5 text-emerald-400" />
                      <span className="font-medium">Real-World Examples</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Phases 2, 3, 4: The Concept Card */}
            <AnimatePresence>
              {phaseIndex >= 2 && (
                <motion.div
                  key="concept-card"
                  initial={{ opacity: 0, y: 40, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.6, type: 'spring', bounce: 0.3 }}
                  className={`w-full max-w-lg glass-card rounded-[2rem] p-6 border transition-colors duration-500 ${
                    phaseIndex === 4
                      ? 'border-primary shadow-[0_0_40px_-10px_rgba(var(--primary-rgb),0.3)] bg-primary/5'
                      : 'border-surface-border bg-surface-soft'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-surface-border-strong/50">
                    <div className="bg-foreground/10 p-2 rounded-lg text-foreground">
                      <Brain className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
                        Concept
                      </p>
                      <h4 className="text-lg font-semibold tracking-tight">
                        Derivatives (Calculus)
                      </h4>
                    </div>
                  </div>

                  {/* Adaptive Content Area */}
                  <div className="relative h-[200px] flex items-center justify-center">
                    <AnimatePresence mode="wait">
                      {activeContent === 'visual' && (
                        <motion.div
                          key="content-visual"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.4 }}
                          className="flex flex-col items-center text-center w-full"
                        >
                          <div className="relative w-full h-24 mb-6 rounded-xl overflow-hidden bg-gradient-to-r from-blue-900/20 via-blue-800/20 to-blue-900/20 border border-blue-500/20 flex items-end px-4">
                            {/* Fake Graph */}
                            <motion.svg
                              className="w-full h-16 font-semibold stroke-blue-500 stroke-[3px] fill-none"
                              preserveAspectRatio="none"
                            >
                              <motion.path
                                d="M 0 60 Q 50 20 100 60 T 200 60 T 300 10"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 1, ease: 'easeInOut' }}
                              />
                              <motion.line
                                x1="70"
                                y1="70"
                                x2="130"
                                y2="10"
                                stroke="#facc15"
                                strokeWidth="2"
                                strokeDasharray="4 4"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.8 }}
                              />
                            </motion.svg>
                          </div>
                          <p className="text-lg font-medium text-blue-400">
                            Slope at a point = rate of change.
                          </p>
                          <p className="text-sm text-muted-foreground mt-2">
                            Visually defined by the tangent line.
                          </p>
                        </motion.div>
                      )}

                      {activeContent === 'logical' && (
                        <motion.div
                          key="content-logical"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.4 }}
                          className="flex w-full px-6 flex-col justify-center"
                        >
                          <div className="space-y-4">
                            <div className="flex gap-4 items-start">
                              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-500 font-bold text-xs shrink-0 mt-0.5">
                                1
                              </div>
                              <p className="text-foreground font-medium">
                                Take the limit as{' '}
                                <span className="text-yellow-400 font-mono text-sm tracking-wider">
                                  h → 0
                                </span>
                              </p>
                            </div>
                            <div className="flex gap-4 items-start">
                              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-500 font-bold text-xs shrink-0 mt-0.5">
                                2
                              </div>
                              <p className="text-foreground font-medium">
                                Find slope:{' '}
                                <span className="text-yellow-400 font-mono text-sm tracking-widest">
                                  [f(x+h) - f(x)] / h
                                </span>
                              </p>
                            </div>
                            <div className="flex gap-4 items-start">
                              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-500 font-bold text-xs shrink-0 mt-0.5">
                                3
                              </div>
                              <p className="text-foreground font-medium">Simplify algebraically.</p>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {activeContent === 'analogy' && (
                        <motion.div
                          key="content-analogy"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.4 }}
                          className="flex flex-col items-center text-center w-full px-4"
                        >
                          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                            <CarFront className="w-8 h-8 text-emerald-400" />
                          </div>
                          <p className="text-xl font-medium text-emerald-400 mb-2">
                            Like pressing the gas pedal.
                          </p>
                          <p className="text-sm text-foreground/80 leading-relaxed max-w-sm">
                            Your location is the function. Your{' '}
                            <span className="text-emerald-400 font-bold">
                              speed at that exact second
                            </span>{' '}
                            is the derivative.
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Lock-in Badge (Phase 4) */}
                  <AnimatePresence>
                    {phaseIndex === 4 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="mt-6 flex justify-center"
                      >
                        <div className="bg-primary/20 border border-primary/40 backdrop-blur-md text-primary-foreground font-medium px-4 py-2 rounded-full shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)] flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                          This is how you understand it.
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

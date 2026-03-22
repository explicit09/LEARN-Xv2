import { describe, it, expect } from 'vitest'
import { buildCoachMessage } from '../coach-signals'
import type { CoachContext } from '../types'

function makeCtx(overrides: Partial<CoachContext> = {}): CoachContext {
  return {
    hasWorkspaces: true,
    dueCardCount: 0,
    overdueCardCount: 0,
    pendingItemCount: 0,
    completedTodayCount: 0,
    totalPlanItems: 0,
    studyStreak: 0,
    daysSinceLastSession: 0,
    examDaysRemaining: null,
    readinessScore: null,
    fadingConceptCount: 0,
    topWeakConcept: null,
    topItemReason: null,
    ...overrides,
  }
}

describe('buildCoachMessage', () => {
  it('shows exam alert when exam is very close and readiness is low', () => {
    const msg = buildCoachMessage(
      makeCtx({
        examDaysRemaining: 2,
        readinessScore: 0.4,
        topWeakConcept: 'Derivatives',
      }),
    )
    expect(msg.eyebrow).toBe('Exam alert')
    expect(msg.tone).toBe('red')
  })

  it('shows falling behind when many overdue cards', () => {
    const msg = buildCoachMessage(makeCtx({ overdueCardCount: 8 }))
    expect(msg.eyebrow).toBe('Falling behind')
    expect(msg.tone).toBe('orange')
  })

  it('shows exam prep when exam is within a week', () => {
    const msg = buildCoachMessage(
      makeCtx({
        examDaysRemaining: 5,
        readinessScore: 0.7,
      }),
    )
    expect(msg.eyebrow).toBe('Exam prep')
  })

  it('shows welcome back after 3+ days away', () => {
    const msg = buildCoachMessage(makeCtx({ daysSinceLastSession: 4 }))
    expect(msg.eyebrow).toBe('Welcome back')
  })

  it('shows review first when due cards and pending items exist', () => {
    const msg = buildCoachMessage(makeCtx({ dueCardCount: 3, pendingItemCount: 2 }))
    expect(msg.eyebrow).toBe('Review first')
  })

  it('shows on fire for long streaks', () => {
    const msg = buildCoachMessage(makeCtx({ studyStreak: 7 }))
    expect(msg.eyebrow).toBe('On fire')
  })

  it('shows momentum when some items done today', () => {
    const msg = buildCoachMessage(
      makeCtx({
        completedTodayCount: 2,
        totalPlanItems: 4,
        pendingItemCount: 2,
      }),
    )
    expect(msg.eyebrow).toBe('Momentum')
  })

  it('shows fading concepts when retention is dropping', () => {
    const msg = buildCoachMessage(makeCtx({ fadingConceptCount: 3 }))
    expect(msg.eyebrow).toBe('Fading concepts')
  })

  it('shows all clear when everything is done', () => {
    const msg = buildCoachMessage(
      makeCtx({
        completedTodayCount: 4,
        totalPlanItems: 4,
        pendingItemCount: 0,
      }),
    )
    expect(msg.eyebrow).toBe('All clear')
  })

  it('shows get started when no workspaces', () => {
    const msg = buildCoachMessage(makeCtx({ hasWorkspaces: false }))
    expect(msg.eyebrow).toBe('Get started')
  })

  it('shows default on track state', () => {
    const msg = buildCoachMessage(makeCtx())
    expect(msg.eyebrow).toBe('On track')
  })

  it('higher priority wins over lower', () => {
    // Exam alert (100) should beat falling behind (90)
    const msg = buildCoachMessage(
      makeCtx({
        examDaysRemaining: 2,
        readinessScore: 0.3,
        overdueCardCount: 10,
      }),
    )
    expect(msg.eyebrow).toBe('Exam alert')
  })
})

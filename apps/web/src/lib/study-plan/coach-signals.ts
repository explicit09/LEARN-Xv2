import type { CoachContext, CoachMessage } from './types'

/**
 * Build a coach message from the current study context.
 * Rules are ordered by priority (highest first). First match wins.
 */
export function buildCoachMessage(ctx: CoachContext): CoachMessage {
  // P100: Exam imminent + low readiness
  if (
    ctx.examDaysRemaining !== null &&
    ctx.examDaysRemaining <= 3 &&
    ctx.readinessScore !== null &&
    ctx.readinessScore < 0.6
  ) {
    const pct = Math.round((ctx.readinessScore ?? 0) * 100)
    const weak = ctx.topWeakConcept ? ` Focus on ${ctx.topWeakConcept}.` : ''
    return {
      eyebrow: 'Exam alert',
      title: `${ctx.examDaysRemaining} day${ctx.examDaysRemaining === 1 ? '' : 's'} to exam`,
      body: `Readiness is at ${pct}%.${weak} Prioritize review over new material.`,
      tone: 'red',
    }
  }

  // P90: Many overdue cards
  if (ctx.overdueCardCount >= 5) {
    return {
      eyebrow: 'Falling behind',
      title: `${ctx.overdueCardCount} overdue cards`,
      body: 'Retention drops fast when reviews are skipped. Clear the queue.',
      tone: 'orange',
    }
  }

  // P80: Exam within a week
  if (ctx.examDaysRemaining !== null && ctx.examDaysRemaining <= 7 && ctx.examDaysRemaining > 3) {
    const pct =
      ctx.readinessScore !== null ? ` Readiness: ${Math.round(ctx.readinessScore * 100)}%.` : ''
    return {
      eyebrow: 'Exam prep',
      title: `${ctx.examDaysRemaining} days to exam`,
      body: `Prioritize review over new material.${pct}`,
      tone: 'purple',
    }
  }

  // P70: Returning after absence
  if (ctx.daysSinceLastSession >= 3) {
    return {
      eyebrow: 'Welcome back',
      title: `${ctx.daysSinceLastSession} days away`,
      body: 'Your streak reset but your progress is still here. Start with a quick review.',
      tone: 'blue',
    }
  }

  // P60: Due cards + pending work
  if (ctx.dueCardCount > 0 && ctx.pendingItemCount > 0) {
    return {
      eyebrow: 'Review first',
      title: `${ctx.dueCardCount} card${ctx.dueCardCount === 1 ? '' : 's'} waiting`,
      body: 'Clear due reviews before starting something new.',
      tone: 'orange',
    }
  }

  // P55: Long streak
  if (ctx.studyStreak >= 7) {
    return {
      eyebrow: 'On fire',
      title: `${ctx.studyStreak}-day streak`,
      body: 'Consistency is your advantage. Keep it going.',
      tone: 'emerald',
    }
  }

  // P50: Partial progress today
  if (ctx.completedTodayCount > 0 && ctx.completedTodayCount < ctx.totalPlanItems) {
    const remaining = ctx.totalPlanItems - ctx.completedTodayCount
    return {
      eyebrow: 'Momentum',
      title: `${ctx.completedTodayCount} of ${ctx.totalPlanItems} done`,
      body: `${remaining} left. Finish strong.`,
      tone: 'emerald',
    }
  }

  // P45: Fading concepts
  if (ctx.fadingConceptCount > 0) {
    return {
      eyebrow: 'Fading concepts',
      title: `${ctx.fadingConceptCount} concept${ctx.fadingConceptCount === 1 ? '' : 's'} losing retention`,
      body: 'A quick review will lock them in.',
      tone: 'orange',
    }
  }

  // P40: Has pending items
  if (ctx.pendingItemCount > 0) {
    const reason = ctx.topItemReason ? ` ${ctx.topItemReason}.` : ''
    return {
      eyebrow: 'Ready',
      title: 'You have a clean next step',
      body: `Pick up where you left off.${reason}`,
      tone: 'emerald',
    }
  }

  // P30: All done today
  if (ctx.completedTodayCount >= ctx.totalPlanItems && ctx.totalPlanItems > 0) {
    return {
      eyebrow: 'All clear',
      title: 'Everything done for today',
      body: 'Open a workspace if you want to go further.',
      tone: 'emerald',
    }
  }

  // P20: No workspaces
  if (!ctx.hasWorkspaces) {
    return {
      eyebrow: 'Get started',
      title: 'Upload your first document',
      body: 'Create a workspace to generate lessons, reviews, and a study plan.',
      tone: 'blue',
    }
  }

  // P10: Default
  return {
    eyebrow: 'On track',
    title: 'Nothing due right now',
    body: 'You are caught up. Open a workspace if you want to keep going.',
    tone: 'emerald',
  }
}

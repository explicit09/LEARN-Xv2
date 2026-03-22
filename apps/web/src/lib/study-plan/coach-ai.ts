import { generateText } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { google, MODEL_ROUTES } from '@/lib/ai'
import { calculateCostUsd } from '@/lib/ai/cost-calculator'
import type { CoachContext } from './types'

/**
 * Generate a short AI coaching message using Flash-Lite.
 * Only called when a heartbeat exists and no fresh coach message is cached.
 * Cost: ~$0.00002 per call.
 */
export async function generateCoachAiMessage(
  supabase: SupabaseClient,
  userId: string,
  planId: string,
  ctx: CoachContext,
): Promise<string> {
  const prompt = `You are a concise study coach. Based on this student's data, write 2-3 sentences of specific, actionable advice. Reference actual numbers and concept names. No generic motivation — be concrete.

Student status:
- Study streak: ${ctx.studyStreak} day${ctx.studyStreak === 1 ? '' : 's'}
- Completed today: ${ctx.completedTodayCount} of ${ctx.totalPlanItems} planned actions
- Due flashcards: ${ctx.dueCardCount}
- Overdue flashcards (>1 day): ${ctx.overdueCardCount}
- Fading concepts (mastery declining): ${ctx.fadingConceptCount}
- Weakest concept: ${ctx.topWeakConcept ?? 'none identified'}
- Days since last session: ${ctx.daysSinceLastSession}
- Exam in: ${ctx.examDaysRemaining !== null ? `${ctx.examDaysRemaining} days` : 'no exam set'}
- Readiness score: ${ctx.readinessScore !== null ? `${Math.round(ctx.readinessScore * 100)}%` : 'n/a'}

Write your coaching message (2-3 sentences, no greeting, no sign-off):`

  const model = google(MODEL_ROUTES.FAST_GENERATION)

  const { text, usage } = await generateText({
    model,
    prompt,
    maxOutputTokens: 100,
  })

  const message = text.trim()
  const costUsd = calculateCostUsd(
    MODEL_ROUTES.FAST_GENERATION,
    usage.inputTokens ?? 0,
    usage.outputTokens ?? 0,
  )

  // Cache the message in the study plan
  await supabase
    .from('study_plans')
    .update({ coach_message: message, coach_generated_at: new Date().toISOString() })
    .eq('id', planId)

  // Track AI call (Rule 6)
  await supabase.from('ai_requests').insert({
    user_id: userId,
    model: MODEL_ROUTES.FAST_GENERATION,
    provider: 'google',
    prompt_tokens: usage.inputTokens ?? 0,
    completion_tokens: usage.outputTokens ?? 0,
    cost_usd: costUsd,
    latency_ms: 0,
    task_name: 'coach_message',
    prompt_version: 'v1',
  })

  return message
}

/**
 * Get the coach AI message for today's plan.
 * Returns cached message if fresh, generates new one if heartbeat exists, or null.
 */
export async function getCoachAiMessage(
  supabase: SupabaseClient,
  userId: string,
  planId: string | undefined,
  ctx: CoachContext,
): Promise<string | null> {
  if (!planId) return null

  const { data: plan } = await supabase
    .from('study_plans')
    .select('heartbeat_at, coach_message, coach_generated_at')
    .eq('id', planId)
    .single()

  if (!plan) return null

  const heartbeatAt = plan.heartbeat_at as string | null
  const coachMessage = plan.coach_message as string | null
  const coachGeneratedAt = plan.coach_generated_at as string | null

  // No heartbeat today → no AI call, return cached or null
  if (!heartbeatAt) return coachMessage

  // Has heartbeat but already generated after it → return cached
  if (coachMessage && coachGeneratedAt && coachGeneratedAt >= heartbeatAt) {
    return coachMessage
  }

  // Heartbeat exists and message is stale or missing → generate
  try {
    return await generateCoachAiMessage(supabase, userId, planId, ctx)
  } catch {
    return coachMessage // fall back to cached on error
  }
}

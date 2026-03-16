import { TRPCError } from '@trpc/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { calculateCostUsd } from '@/lib/ai/cost-calculator'

const DAILY_LIMIT_USD = parseFloat(process.env.DAILY_SPEND_LIMIT_USD ?? '5')

/**
 * Check if a user has exceeded their daily AI spend budget.
 * Sums all ai_requests cost for the user today.
 * Throws TRPCError(TOO_MANY_REQUESTS) if exceeded.
 */
export async function checkUserDailyBudget(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const today = new Date().toISOString().split('T')[0]

  const { data: requests } = await supabase
    .from('ai_requests')
    .select('model, prompt_tokens, completion_tokens')
    .eq('user_id', userId)
    .gte('created_at', `${today}T00:00:00Z`)

  if (!requests?.length) return

  const totalSpend = requests.reduce((sum, r) => {
    return (
      sum +
      calculateCostUsd(
        r.model as string,
        (r.prompt_tokens as number) ?? 0,
        (r.completion_tokens as number) ?? 0,
      )
    )
  }, 0)

  if (totalSpend >= DAILY_LIMIT_USD) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: `Daily AI budget exceeded ($${totalSpend.toFixed(2)} / $${DAILY_LIMIT_USD.toFixed(2)}). Resets at midnight UTC.`,
    })
  }
}

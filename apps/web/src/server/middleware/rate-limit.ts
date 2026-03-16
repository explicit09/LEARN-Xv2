import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { TRPCError } from '@trpc/server'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Rate limit configurations per endpoint category
const limiters = {
  chat: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 h'),
    prefix: 'rl:chat',
  }),
  generate: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 h'),
    prefix: 'rl:generate',
  }),
  regenerate: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    prefix: 'rl:regenerate',
  }),
} as const

export type RateLimitCategory = keyof typeof limiters

/**
 * Check rate limit for a user + category. Throws TRPCError(429) if exceeded.
 */
export async function checkRateLimit(userId: string, category: RateLimitCategory): Promise<void> {
  const limiter = limiters[category]
  const { success, remaining, reset } = await limiter.limit(userId)

  if (!success) {
    const retryAfterSeconds = Math.ceil((reset - Date.now()) / 1000)
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: `Rate limit exceeded. Try again in ${retryAfterSeconds} seconds.`,
    })
  }
}

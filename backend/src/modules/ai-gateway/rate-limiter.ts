import { redis } from '../../lib/redis'
import { prisma } from '../../lib/prisma'

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
}

const RATE_LIMITS = {
  minute: Number(process.env.AI_RATE_LIMIT_MINUTE ?? '10000'),
  hour: Number(process.env.AI_RATE_LIMIT_HOUR ?? '200000'),
  month: Number(process.env.AI_RATE_LIMIT_MONTH ?? '5000000'),
}

type RateLimitWindow = 'minute' | 'hour' | 'month'

function getWindowMs(window: RateLimitWindow): number {
  switch (window) {
    case 'minute':
      return 60 * 1000
    case 'hour':
      return 60 * 60 * 1000
    case 'month':
      return 30 * 24 * 60 * 60 * 1000
  }
}

function getKey(userId: string, window: RateLimitWindow): string {
  return `ratelimit:${userId}:${window}`
}

export async function checkRateLimit(
  userId: string,
  window: RateLimitWindow,
  tokens: number,
  limits: Record<string, number> = RATE_LIMITS
): Promise<RateLimitResult> {
  const limit = limits[window] ?? RATE_LIMITS[window]
  const key = getKey(userId, window)
  const now = Date.now()
  const windowMs = getWindowMs(window)
  const windowStart = now - windowMs

  // Use Redis ZSET for sliding window rate limiting
  // Score is timestamp, member is unique ID
  const multi = redis.multi()

  // Remove entries outside the current window
  multi.zremrangebyscore(key, 0, windowStart)

  // Count current requests in window
  multi.zcard(key)

  // Add current request with timestamp as score
  multi.zadd(key, now, `${now}:${Math.random()}`)

  // Set expiry on the key
  multi.pexpire(key, windowMs)

  const results = await multi.exec()
  if (!results) {
    throw new Error('Redis transaction failed')
  }

  // results[1] is zcard result (count before adding current request)
  const currentCount = (results[1]?.[1] as number) || 0

  const allowed = currentCount + tokens <= limit
  const remaining = Math.max(0, limit - currentCount - tokens)

  // Calculate reset time (end of current window)
  const resetAt = new Date(now + windowMs)

  if (!allowed) {
    // If not allowed, remove the request we just added
    await redis.zremrangebyscore(key, now, now)
    return { allowed: false, remaining: 0, resetAt }
  }

  return { allowed: true, remaining, resetAt }
}

export async function getRateLimitStatus(
  userId: string,
  window: RateLimitWindow
): Promise<{ used: number; limit: number; remaining: number }> {
  const limit = RATE_LIMITS[window]
  const key = getKey(userId, window)
  const now = Date.now()
  const windowMs = getWindowMs(window)
  const windowStart = now - windowMs

  // Clean old entries and count
  await redis.zremrangebyscore(key, 0, windowStart)
  const used = await redis.zcard(key)

  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
  }
}

export async function resetRateLimit(
  userId: string,
  window: RateLimitWindow
): Promise<void> {
  const key = getKey(userId, window)
  await redis.del(key)
}

/**
 * Simple in-memory rate limiter — max N requests per window per key (IP).
 * Resets automatically. Not shared across serverless instances (fine for single-server/dev).
 * For multi-instance production, swap the Map for Redis.
 */

interface RateEntry {
  count: number
  windowStart: number
}

const store = new Map<string, RateEntry>()

const WINDOW_MS  = 60_000   // 1 minute
const FREE_LIMIT = 5        // anonymous: 5 req/min
const PRO_LIMIT  = 60       // pro users: 60 req/min
const AUTH_LIMIT = 30       // auth endpoints: 30 req/min — bots send hundreds, humans send ~5

// Clean up old entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (now - entry.windowStart > WINDOW_MS * 2) store.delete(key)
  }
}, 5 * 60_000)

export function checkRateLimit(ip: string, isPro: boolean): { allowed: boolean; remaining: number; resetIn: number } {
  const limit = isPro ? PRO_LIMIT : FREE_LIMIT
  return _check(ip, limit)
}

export function checkAuthRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  return _check(`auth:${ip}`, AUTH_LIMIT)
}

function _check(key: string, limit: number): { allowed: boolean; remaining: number; resetIn: number } {
  const now   = Date.now()
  const entry = store.get(key)

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    store.set(key, { count: 1, windowStart: now })
    return { allowed: true, remaining: limit - 1, resetIn: WINDOW_MS }
  }

  if (entry.count >= limit) {
    const resetIn = WINDOW_MS - (now - entry.windowStart)
    return { allowed: false, remaining: 0, resetIn }
  }

  entry.count++
  return { allowed: true, remaining: limit - entry.count, resetIn: WINDOW_MS - (now - entry.windowStart) }
}

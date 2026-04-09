/**
 * Admin brute-force protection.
 * Tracks failed login attempts per IP.
 * After 3 failures → locked out for 5 minutes.
 * Every attempt (success or failure) is logged.
 */

interface AttemptRecord {
  failures:   number
  lockedUntil: number | null
  lastAttempt: number
}

const attempts = new Map<string, AttemptRecord>()

const MAX_FAILURES  = 3
const LOCKOUT_MS    = 5 * 60 * 1000   // 5 minutes
const WINDOW_MS     = 15 * 60 * 1000  // reset counter after 15 min of no attempts

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now()
  for (const [ip, rec] of attempts.entries()) {
    if (now - rec.lastAttempt > WINDOW_MS * 2) attempts.delete(ip)
  }
}, 10 * 60_000)

export interface LockoutStatus {
  allowed:     boolean
  remainingSec?: number   // seconds until lockout expires
  failures?:   number     // how many failures so far
}

export function checkAdminAttempt(ip: string): LockoutStatus {
  const now = Date.now()
  const rec = attempts.get(ip)

  if (!rec) return { allowed: true, failures: 0 }

  // Check if currently locked out
  if (rec.lockedUntil && now < rec.lockedUntil) {
    const remainingSec = Math.ceil((rec.lockedUntil - now) / 1000)
    return { allowed: false, remainingSec }
  }

  // Lockout expired — reset
  if (rec.lockedUntil && now >= rec.lockedUntil) {
    attempts.delete(ip)
    return { allowed: true, failures: 0 }
  }

  // Reset counter if no attempts for WINDOW_MS
  if (now - rec.lastAttempt > WINDOW_MS) {
    attempts.delete(ip)
    return { allowed: true, failures: 0 }
  }

  return { allowed: true, failures: rec.failures }
}

export function recordAdminFailure(ip: string) {
  const now = Date.now()
  const rec = attempts.get(ip) ?? { failures: 0, lockedUntil: null, lastAttempt: now }

  rec.failures++
  rec.lastAttempt = now

  if (rec.failures >= MAX_FAILURES) {
    rec.lockedUntil = now + LOCKOUT_MS
    console.warn(
      `[admin-lockout] IP ${ip} LOCKED after ${rec.failures} failed attempts.` +
      ` Locked until ${new Date(rec.lockedUntil).toISOString()}`
    )
  } else {
    console.warn(
      `[admin-lockout] IP ${ip} failed attempt ${rec.failures}/${MAX_FAILURES}.` +
      ` ${MAX_FAILURES - rec.failures} attempt(s) remaining.`
    )
  }

  attempts.set(ip, rec)
}

export function recordAdminSuccess(ip: string) {
  // Clear failure record on successful login
  attempts.delete(ip)
  console.info(`[admin-lockout] IP ${ip} authenticated successfully.`)
}

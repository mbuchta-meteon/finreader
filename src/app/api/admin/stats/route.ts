import { NextRequest, NextResponse } from 'next/server'
import { getAdminStats } from '@/lib/db'
import { checkAdminAttempt, recordAdminFailure, recordAdminSuccess } from '@/lib/admin-lockout'
import { getIP } from '@/lib/fingerprint'

export async function POST(req: NextRequest) {
  const ip = getIP(req)

  // Check lockout before even reading the body
  const lockout = checkAdminAttempt(ip)
  if (!lockout.allowed) {
    console.warn(`[admin] Blocked locked-out IP ${ip} — ${lockout.remainingSec}s remaining`)
    return NextResponse.json(
      { error: `Too many failed attempts. Try again in ${lockout.remainingSec} seconds.` },
      { status: 429 }
    )
  }

  const { secret } = await req.json()

  if (secret !== process.env.ADMIN_SECRET) {
    recordAdminFailure(ip)
    const updated = checkAdminAttempt(ip)
    const isNowLocked = !updated.allowed

    return NextResponse.json(
      {
        error: isNowLocked
          ? `Incorrect password. Account locked for 5 minutes.`
          : `Incorrect password. ${3 - (updated.failures ?? 0)} attempt(s) remaining.`,
      },
      { status: 401 }
    )
  }

  recordAdminSuccess(ip)
  const stats = await getAdminStats()
  return NextResponse.json(stats)
}

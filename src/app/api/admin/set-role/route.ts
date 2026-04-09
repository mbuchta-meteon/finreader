import { NextRequest, NextResponse } from 'next/server'
import { getDb, ensureSchema } from '@/lib/db'
import { checkAdminAttempt, recordAdminFailure, recordAdminSuccess } from '@/lib/admin-lockout'
import { getIP } from '@/lib/fingerprint'

export async function POST(req: NextRequest) {
  const ip = getIP(req)

  const lockout = checkAdminAttempt(ip)
  if (!lockout.allowed) {
    console.warn(`[admin] Blocked locked-out IP ${ip} on set-role — ${lockout.remainingSec}s remaining`)
    return NextResponse.json(
      { error: `Too many failed attempts. Try again in ${lockout.remainingSec} seconds.` },
      { status: 429 }
    )
  }

  const { secret, userId, role } = await req.json()

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

  if (!userId || !['free', 'pro', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
  }

  recordAdminSuccess(ip)
  await ensureSchema()
  const db = getDb()
  await db.execute({ sql: 'UPDATE users SET role = ? WHERE id = ?', args: [role, userId] })
  const r = await db.execute({ sql: 'SELECT id, email, name, role FROM users WHERE id = ?', args: [userId] })
  return NextResponse.json({ ok: true, user: r.rows[0] })
}

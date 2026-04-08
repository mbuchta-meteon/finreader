import { NextRequest, NextResponse } from 'next/server'
import { getDb, ensureSchema } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { secret, userId, role } = await req.json()
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!userId || !['free', 'pro', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
  }
  await ensureSchema()
  const db = getDb()
  await db.execute({ sql: 'UPDATE users SET role = ? WHERE id = ?', args: [role, userId] })
  const r = await db.execute({ sql: 'SELECT id, email, name, role FROM users WHERE id = ?', args: [userId] })
  return NextResponse.json({ ok: true, user: r.rows[0] })
}

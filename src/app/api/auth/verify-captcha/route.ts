import { NextRequest, NextResponse } from 'next/server'
import { verifyTurnstile } from '@/lib/turnstile'
import { getIP } from '@/lib/fingerprint'

// Called before sending a magic link — verifies the user passed CAPTCHA
export async function POST(req: NextRequest) {
  const { token } = await req.json()
  if (!token) {
    return NextResponse.json({ error: 'CAPTCHA token required' }, { status: 400 })
  }
  const ip = getIP(req)
  const ok = await verifyTurnstile(token, ip)
  if (!ok) {
    return NextResponse.json({ error: 'CAPTCHA failed' }, { status: 403 })
  }
  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAttempt, recordAdminFailure, recordAdminSuccess } from '@/lib/admin-lockout'
import { getIP } from '@/lib/fingerprint'

export async function POST(req: NextRequest) {
  const ip = getIP(req)

  const lockout = checkAdminAttempt(ip)
  if (!lockout.allowed) {
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
  return NextResponse.json({
    stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
    stripePriceId:    process.env.STRIPE_PRICE_ID ?? null,
    stripeMode:       process.env.STRIPE_SECRET_KEY?.startsWith('sk_live') ? 'live' : 'test',
    priceAmount:      process.env.STRIPE_PRICE_AMOUNT ?? '4.00',
    priceCurrency:    process.env.STRIPE_PRICE_CURRENCY ?? 'EUR',
  })
}

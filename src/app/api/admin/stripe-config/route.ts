import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { secret } = await req.json()
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({
    stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
    stripePriceId:    process.env.STRIPE_PRICE_ID ?? null,
    stripeMode:       process.env.STRIPE_SECRET_KEY?.startsWith('sk_live') ? 'live' : 'test',
    priceAmount:      process.env.STRIPE_PRICE_AMOUNT ?? '4.00',
    priceCurrency:    process.env.STRIPE_PRICE_CURRENCY ?? 'EUR',
  })
}

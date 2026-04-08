import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { auth } from '@/lib/auth'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder', {
    apiVersion: '2025-03-31.basil',
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  const userId  = session?.user?.id as string | undefined
  const email   = session?.user?.email as string | undefined

  if (!userId || !email) {
    return NextResponse.json({ error: 'Must be signed in to upgrade' }, { status: 401 })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Payments not configured yet' }, { status: 503 })
  }

  const origin = req.headers.get('origin') ?? 'http://localhost:3000'

  const checkoutSession = await getStripe().checkout.sessions.create({
    mode:               'subscription',
    payment_method_types: ['card'],
    customer_email:     email,
    line_items: [{
      price:    process.env.STRIPE_PRICE_ID!,
      quantity: 1,
    }],
    success_url: `${origin}/account?upgraded=true`,
    cancel_url:  `${origin}/account?cancelled=true`,
    metadata: { userId },
    subscription_data: {
      metadata: { userId },
    },
  })

  return NextResponse.json({ url: checkoutSession.url })
}

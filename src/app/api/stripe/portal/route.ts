import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { auth } from '@/lib/auth'
import { getUserById } from '@/lib/db'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder', {
    apiVersion: '2025-03-31.basil',
  })
}

// Creates a Stripe Customer Portal session so the user can manage/cancel their subscription
export async function POST(req: NextRequest) {
  const session = await auth()
  const userId  = session?.user?.id as string | undefined

  if (!userId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Payments not configured' }, { status: 503 })
  }

  const user = await getUserById(userId)
  if (!user?.stripeCustomerId) {
    return NextResponse.json({ error: 'No active subscription found' }, { status: 400 })
  }

  const origin = req.headers.get('origin') ?? 'https://finreader.vercel.app'

  const portalSession = await getStripe().billingPortal.sessions.create({
    customer:   user.stripeCustomerId,
    return_url: `${origin}/account`,
  })

  return NextResponse.json({ url: portalSession.url })
}

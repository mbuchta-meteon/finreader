import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { setUserPro, setUserFree, ensureSchema } from '@/lib/db'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder', {
    apiVersion: '2025-03-31.basil',
  })
}

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const body      = await req.text()
  const signature = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature failed:', (err as Error).message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  await ensureSchema()

  switch (event.type) {

    case 'checkout.session.completed': {
      const session    = event.data.object as Stripe.Checkout.Session
      const userId     = session.metadata?.userId
      const customerId = session.customer as string
      const subId      = session.subscription as string
      if (userId && customerId && subId) {
        await setUserPro(userId, customerId, subId)
        console.log(`[stripe] User ${userId} upgraded to Pro`)
      }
      break
    }

    case 'customer.subscription.updated': {
      const sub    = event.data.object as Stripe.Subscription
      const userId = sub.metadata?.userId
      if (!userId) break
      if (sub.status === 'active') {
        await setUserPro(userId, sub.customer as string, sub.id)
        console.log(`[stripe] Subscription reactivated for ${userId}`)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub    = event.data.object as Stripe.Subscription
      const userId = sub.metadata?.userId
      if (userId) {
        await setUserFree(userId)
        console.log(`[stripe] User ${userId} downgraded to Free`)
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      console.warn(`[stripe] Payment failed for customer ${invoice.customer}`)
      break
    }
  }

  return NextResponse.json({ received: true })
}

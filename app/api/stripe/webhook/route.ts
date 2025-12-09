import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    // Check if this is a lifetime deal purchase
    if (session.metadata?.type === 'lifetime_deal') {
      const userId = session.metadata.userId

      if (userId) {
        // Update user with lifetime access
        await prisma.user.update({
          where: { id: userId },
          data: {
            hasLifetimeDeal: true,
            lifetimePurchasedAt: new Date(),
            stripePaymentId: session.payment_intent as string,
          },
        })

        console.log(`User ${userId} purchased lifetime deal!`)
      }
    }
  }

  return NextResponse.json({ received: true })
}

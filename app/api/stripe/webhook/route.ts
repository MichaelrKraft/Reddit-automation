import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { getCurrentTierInfo } from '@/lib/stripe'
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
      const purchasedTier = session.metadata.tier
      const purchasedTierLabel = session.metadata.tierLabel

      if (userId) {
        // Get count BEFORE this purchase (for logging)
        const countBefore = await prisma.user.count({
          where: { hasLifetimeDeal: true }
        })

        // Update user with lifetime access
        await prisma.user.update({
          where: { id: userId },
          data: {
            hasLifetimeDeal: true,
            lifetimePurchasedAt: new Date(),
            stripePaymentId: session.payment_intent as string,
          },
        })

        // Get count AFTER this purchase
        const countAfter = countBefore + 1

        // Get tier info before and after
        const tierBefore = getCurrentTierInfo(countBefore)
        const tierAfter = getCurrentTierInfo(countAfter)

        // Log the purchase with tier details
        console.log(`
========================================
💰 LIFETIME DEAL PURCHASED
========================================
User ID: ${userId}
Payment ID: ${session.payment_intent}
Purchased Tier: ${purchasedTierLabel} (Tier ${purchasedTier})
Amount Paid: $${(session.amount_total || 0) / 100}
----------------------------------------
Deals Sold: ${countBefore} → ${countAfter}
Current Tier: ${tierAfter.label} (Tier ${tierAfter.tier})
Spots Remaining at Current Price: ${tierAfter.spotsRemaining}
Next Price: $${tierAfter.price / 100}
========================================
        `)

        // Log tier transition if it occurred
        if (tierBefore.tier !== tierAfter.tier) {
          console.log(`
🚀 TIER TRANSITION ALERT!
========================================
Previous Tier: ${tierBefore.label} ($${tierBefore.price / 100})
New Tier: ${tierAfter.label} ($${tierAfter.price / 100})
This was deal #${countAfter}
========================================
          `)
        }

        // Check for tier mismatch (race condition detection)
        if (purchasedTier && parseInt(purchasedTier) !== tierBefore.tier) {
          console.warn(`
⚠️  TIER MISMATCH DETECTED (possible race condition)
========================================
User purchased at Tier ${purchasedTier} (${purchasedTierLabel})
But current tier at checkout was Tier ${tierBefore.tier} (${tierBefore.label})
This is OK - customer got a better deal
========================================
          `)
        }
      }
    }
  }

  return NextResponse.json({ received: true })
}

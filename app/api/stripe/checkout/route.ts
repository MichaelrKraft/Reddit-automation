import { NextRequest, NextResponse } from 'next/server'
import { stripe, getCurrentTierInfo, LIFETIME_DEAL_PRODUCT_NAME } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()

    // Check if user already has lifetime deal
    if (user.hasLifetimeDeal) {
      return NextResponse.json(
        { error: 'You already have lifetime access!' },
        { status: 400 }
      )
    }

    // Get count of lifetime deals already sold
    const lifetimeDealsSold = await prisma.user.count({
      where: { hasLifetimeDeal: true }
    })

    // Get current tier pricing
    const tierInfo = getCurrentTierInfo(lifetimeDealsSold)

    // Create or get Stripe customer
    let customerId = user.stripeCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
          clerkId: user.clerkId,
        },
      })
      customerId = customer.id

      // Save customer ID to user
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      })
    }

    // Create checkout session with tiered pricing
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${LIFETIME_DEAL_PRODUCT_NAME} - ${tierInfo.label}`,
              description: `One-time payment for lifetime access to ReddRide (${tierInfo.discount}). Never pay again!`,
            },
            unit_amount: tierInfo.price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?lifetime=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?lifetime=cancelled`,
      metadata: {
        userId: user.id,
        type: 'lifetime_deal',
        tier: tierInfo.tier.toString(),
        tierLabel: tierInfo.label,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Stripe checkout error:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

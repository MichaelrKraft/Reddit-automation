import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { stripe, LIFETIME_DEAL_TIERS, getCurrentTierInfo } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

// GET: Fetch payment data from Stripe (admin only)
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    // Fetch recent payments/charges from Stripe
    const charges = await stripe.charges.list({
      limit,
      expand: ['data.customer']
    })

    // Format payment data
    const payments = charges.data.map(charge => ({
      id: charge.id,
      amount: charge.amount,
      amountFormatted: `$${(charge.amount / 100).toFixed(2)}`,
      currency: charge.currency.toUpperCase(),
      status: charge.status,
      paid: charge.paid,
      refunded: charge.refunded,
      customerEmail: typeof charge.customer === 'object' && charge.customer && 'email' in charge.customer && charge.customer.email
        ? charge.customer.email
        : charge.billing_details?.email || 'N/A',
      customerName: charge.billing_details?.name || 'N/A',
      description: charge.description || 'Lifetime Deal',
      created: new Date(charge.created * 1000).toISOString(),
      receiptUrl: charge.receipt_url,
      last4: charge.payment_method_details?.card?.last4 || null,
      brand: charge.payment_method_details?.card?.brand || null,
    }))

    // Calculate totals
    const totalRevenue = charges.data
      .filter(c => c.paid && !c.refunded)
      .reduce((sum, c) => sum + c.amount, 0)

    const refundedAmount = charges.data
      .filter(c => c.refunded)
      .reduce((sum, c) => sum + (c.amount_refunded || 0), 0)

    // Get customer count
    const customers = await stripe.customers.list({ limit: 1 })

    // Get lifetime deal users count from database
    const lifetimeDealUsers = await prisma.user.count({
      where: { hasLifetimeDeal: true }
    })

    // Get current tier info
    const currentTier = getCurrentTierInfo(lifetimeDealUsers)

    // Build LTD tier progress
    const ltdTierProgress = LIFETIME_DEAL_TIERS.map(tier => {
      let sold = 0
      if (lifetimeDealUsers >= tier.maxCount) {
        // This tier is fully sold
        sold = tier.maxCount - (tier.tier === 1 ? 0 : LIFETIME_DEAL_TIERS[tier.tier - 2].maxCount)
      } else if (lifetimeDealUsers > (tier.tier === 1 ? 0 : LIFETIME_DEAL_TIERS[tier.tier - 2].maxCount)) {
        // This tier is partially sold
        sold = lifetimeDealUsers - (tier.tier === 1 ? 0 : LIFETIME_DEAL_TIERS[tier.tier - 2].maxCount)
      }
      const max = tier.maxCount - (tier.tier === 1 ? 0 : LIFETIME_DEAL_TIERS[tier.tier - 2].maxCount)
      return {
        tier: tier.tier,
        label: tier.label,
        price: tier.price,
        priceFormatted: `$${(tier.price / 100).toFixed(0)}`,
        sold,
        max,
        isCurrent: tier.tier === currentTier.tier,
        isSoldOut: sold >= max
      }
    })

    // Calculate monthly revenue trend (last 12 months)
    const now = new Date()
    const mrrTrend = []

    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)

      // Get charges for this month from Stripe
      const monthCharges = await stripe.charges.list({
        created: {
          gte: Math.floor(monthStart.getTime() / 1000),
          lte: Math.floor(monthEnd.getTime() / 1000)
        },
        limit: 100
      })

      const monthRevenue = monthCharges.data
        .filter(c => c.paid && !c.refunded)
        .reduce((sum, c) => sum + c.amount, 0)

      mrrTrend.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: monthRevenue,
        revenueFormatted: `$${(monthRevenue / 100).toFixed(0)}`,
        count: monthCharges.data.filter(c => c.paid && !c.refunded).length
      })
    }

    return NextResponse.json({
      payments,
      summary: {
        totalPayments: charges.data.length,
        successfulPayments: charges.data.filter(c => c.paid && !c.refunded).length,
        totalRevenue,
        totalRevenueFormatted: `$${(totalRevenue / 100).toFixed(2)}`,
        refundedAmount,
        refundedAmountFormatted: `$${(refundedAmount / 100).toFixed(2)}`,
        totalCustomers: customers.data.length > 0 ? 'Available' : 0
      },
      revenue: {
        mrrTrend,
        ltdProgress: {
          totalSold: lifetimeDealUsers,
          currentTier: currentTier.tier,
          currentTierLabel: currentTier.label,
          currentPrice: currentTier.price,
          currentPriceFormatted: `$${(currentTier.price / 100).toFixed(0)}`,
          spotsRemaining: currentTier.spotsRemaining,
          tiers: ltdTierProgress
        }
      },
      hasMore: charges.has_more
    })
  } catch (error) {
    console.error('[Admin Payments] Error fetching payments:', error)
    if (error instanceof Error && error.message.includes('Admin')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}

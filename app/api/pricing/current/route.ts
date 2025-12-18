import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentTierInfo, LIFETIME_DEAL_TIERS, FULL_PRICE } from '@/lib/stripe'

export async function GET() {
  try {
    // Get count of lifetime deals already sold
    const lifetimeDealsSold = await prisma.user.count({
      where: { hasLifetimeDeal: true }
    })

    // Get current tier pricing
    const tierInfo = getCurrentTierInfo(lifetimeDealsSold)

    return NextResponse.json({
      currentTier: tierInfo,
      allTiers: LIFETIME_DEAL_TIERS,
      fullPrice: FULL_PRICE,
      totalSold: lifetimeDealsSold,
    })
  } catch (error: any) {
    console.error('Pricing API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get pricing info' },
      { status: 500 }
    )
  }
}

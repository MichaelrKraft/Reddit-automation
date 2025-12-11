import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'

const FOUNDER_LIMIT = 20

export async function GET() {
  try {
    const user = await getOrCreateUser()

    // Count total users and founders
    const [totalUsers, founderCount] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { tier: 'FOUNDER' } })
    ])

    const founderSpotsRemaining = Math.max(0, FOUNDER_LIMIT - founderCount)

    // If user is logged in, return their tier info
    if (user) {
      return NextResponse.json({
        isLoggedIn: true,
        tier: user.tier,
        signupNumber: user.signupNumber,
        hasLifetimeDeal: user.hasLifetimeDeal,
        lifetimePurchasedAt: user.lifetimePurchasedAt,
        totalUsers,
        founderSpotsRemaining,
        isFounder: user.tier === 'FOUNDER',
        canPurchaseLifetime: user.tier === 'FOUNDER' && !user.hasLifetimeDeal,
      })
    }

    // Return public stats for non-logged-in users
    return NextResponse.json({
      isLoggedIn: false,
      totalUsers,
      founderSpotsRemaining,
    })
  } catch (error: any) {
    console.error('User stats error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get user stats' },
      { status: 500 }
    )
  }
}

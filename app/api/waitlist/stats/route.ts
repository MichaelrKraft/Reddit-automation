import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const FOUNDER_LIMIT = 20

export async function GET() {
  try {
    // Get waitlist count
    const waitlistCount = await prisma.waitlist.count()

    // Get founder count
    const founderCount = await prisma.user.count({
      where: { tier: 'FOUNDER' },
    })

    const founderSpotsRemaining = Math.max(0, FOUNDER_LIMIT - founderCount)
    const isSoldOut = founderSpotsRemaining === 0

    return NextResponse.json({
      count: waitlistCount,
      founderSpotsRemaining,
      founderLimit: FOUNDER_LIMIT,
      isSoldOut,
    })
  } catch (error: any) {
    console.error('Waitlist stats error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch waitlist stats', count: 0 },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { email, name, referralCode } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existing = await prisma.waitlist.findUnique({
      where: { email },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'This email is already on the waitlist', position: existing.position },
        { status: 400 }
      )
    }

    // Get the next position
    const lastEntry = await prisma.waitlist.findFirst({
      orderBy: { position: 'desc' },
    })
    const nextPosition = (lastEntry?.position || 0) + 1

    // Create waitlist entry
    const waitlistEntry = await prisma.waitlist.create({
      data: {
        email,
        name: name || null,
        referralCode: referralCode || null,
        position: nextPosition,
      },
    })

    return NextResponse.json({
      success: true,
      position: waitlistEntry.position,
      message: `You're #${waitlistEntry.position} on the waitlist!`,
    })
  } catch (error: any) {
    console.error('Waitlist error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to join waitlist' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const entries = await prisma.waitlist.findMany({
      orderBy: { position: 'asc' },
      select: {
        position: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      count: entries.length,
      entries,
    })
  } catch (error: any) {
    console.error('Waitlist fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch waitlist' },
      { status: 500 }
    )
  }
}

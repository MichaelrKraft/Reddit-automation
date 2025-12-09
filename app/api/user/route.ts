import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await requireUser()

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        tier: user.tier,
        signupNumber: user.signupNumber,
        hasLifetimeDeal: user.hasLifetimeDeal,
        lifetimePurchasedAt: user.lifetimePurchasedAt,
        createdAt: user.createdAt,
      }
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

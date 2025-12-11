import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'

// Temporary endpoint to fix early users who should be founders
// DELETE THIS AFTER USE
export async function POST() {
  try {
    const user = await getOrCreateUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Count how many users exist
    const totalUsers = await prisma.user.count()

    // Get the earliest users by createdAt
    const earlyUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      take: 10,
    })

    // Check if current user is among the first 10
    const userIndex = earlyUsers.findIndex(u => u.id === user.id)

    if (userIndex === -1 && totalUsers > 10) {
      return NextResponse.json({
        error: 'You are not among the first 10 users',
        totalUsers,
        yourId: user.id
      }, { status: 400 })
    }

    // Update user to FOUNDER with correct signup number
    const signupNumber = userIndex >= 0 ? userIndex + 1 : totalUsers

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        tier: 'FOUNDER',
        signupNumber: signupNumber,
      }
    })

    return NextResponse.json({
      success: true,
      message: `Updated to FOUNDER #${signupNumber}`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        tier: updatedUser.tier,
        signupNumber: updatedUser.signupNumber,
      }
    })
  } catch (error: any) {
    console.error('Fix founder error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

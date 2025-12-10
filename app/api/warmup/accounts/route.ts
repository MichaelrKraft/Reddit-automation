import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'

// POST - Add a new Reddit account for warmup
export async function POST(request: NextRequest) {
  try {
    const user = await getOrCreateUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Please sign in to add a Reddit account' },
        { status: 401 }
      )
    }

    const { username, password } = await request.json()

    if (!username) {
      return NextResponse.json(
        { error: 'Reddit username is required' },
        { status: 400 }
      )
    }

    // Check if account already exists
    const existingAccount = await prisma.redditAccount.findFirst({
      where: {
        username: username.replace(/^u\//, ''), // Remove u/ prefix if present
        userId: user.id
      },
    })

    if (existingAccount) {
      return NextResponse.json(
        { error: 'This Reddit account is already connected' },
        { status: 400 }
      )
    }

    // Create the Reddit account
    const account = await prisma.redditAccount.create({
      data: {
        username: username.replace(/^u\//, ''),
        userId: user.id,
        connected: true,
        karma: 0,
        isWarmupAccount: true,
        warmupStatus: 'NOT_STARTED',
      },
    })

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        username: account.username,
        status: account.warmupStatus,
      },
      message: `Reddit account u/${account.username} added successfully. Click "Start Warmup" to begin.`,
    })
  } catch (error) {
    console.error('Error adding Reddit account:', error)
    return NextResponse.json(
      { error: 'Failed to add Reddit account' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'

// Queue status endpoint - provides warmup job status information
// Warmup uses database-based scheduling rather than BullMQ

export async function GET(request: NextRequest) {
  try {
    const user = await getOrCreateUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Please sign in to view queue status' },
        { status: 401 }
      )
    }

    // Get warmup accounts and calculate queue-like metrics
    const accounts = await prisma.redditAccount.findMany({
      where: {
        userId: user.id,
        isWarmupAccount: true,
      },
      select: {
        id: true,
        warmupStatus: true,
        warmupStartedAt: true,
        warmupProgress: true,
      },
    })

    // Calculate queue-like status from account states
    const activePhases = ['PHASE_1_UPVOTES', 'PHASE_2_COMMENTS', 'PHASE_3_POSTS', 'PHASE_4_MIXED']

    const waiting = accounts.filter(a => a.warmupStatus === 'NOT_STARTED').length
    const active = accounts.filter(a => activePhases.includes(a.warmupStatus || '')).length
    const completed = accounts.filter(a => a.warmupStatus === 'COMPLETED').length
    const failed = accounts.filter(a => a.warmupStatus === 'FAILED').length
    const delayed = accounts.filter(a => a.warmupStatus === 'PAUSED').length

    // Find next scheduled action
    let nextJob = null
    const activeAccount = accounts.find(a => activePhases.includes(a.warmupStatus || ''))
    if (activeAccount) {
      const progress = activeAccount.warmupProgress as Record<string, unknown> | null
      const lastAction = progress?.lastActionAt as string | undefined
      if (lastAction) {
        // Estimate next action (warmup runs every 6-8 hours)
        const lastActionTime = new Date(lastAction).getTime()
        const nextActionTime = lastActionTime + (7 * 60 * 60 * 1000) // 7 hours average
        nextJob = {
          accountId: activeAccount.id,
          scheduledFor: new Date(nextActionTime).toISOString(),
        }
      }
    }

    return NextResponse.json({
      waiting,
      active,
      completed,
      failed,
      delayed,
      nextJob,
    })
  } catch (error) {
    console.error('Error fetching queue status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch queue status' },
      { status: 500 }
    )
  }
}

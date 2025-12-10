import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getWarmupOrchestrator } from '@/lib/warmup-orchestrator'
import { calculatePhase } from '@/lib/warmup-worker'
import { getOrCreateUser } from '@/lib/auth'
import { fetchUserProfile } from '@/lib/spy-mode/tracker'

// GET - List all warmup accounts with detailed status
export async function GET(request: NextRequest) {
  try {
    const user = await getOrCreateUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Please sign in to view warmup accounts' },
        { status: 401 }
      )
    }

    // Get all warmup accounts for user
    const accounts = await prisma.redditAccount.findMany({
      where: {
        userId: user.id,
        isWarmupAccount: true,
      },
      orderBy: [
        { warmupStatus: 'asc' },
        { warmupStartedAt: 'desc' },
      ],
    })

    // Fetch real karma from Reddit for each account and update DB
    const enrichedAccounts = await Promise.all(accounts.map(async (account) => {
      // Fetch real karma from Reddit
      let currentKarma = account.karma
      try {
        const profile = await fetchUserProfile(account.username)
        if (profile && profile.totalKarma !== account.karma) {
          currentKarma = profile.totalKarma
          // Update karma in database
          await prisma.redditAccount.update({
            where: { id: account.id },
            data: { karma: currentKarma },
          })
        }
      } catch (err) {
        console.error(`Failed to fetch karma for ${account.username}:`, err)
      }
      // Calculate days in warmup
      const daysInWarmup = account.warmupStartedAt
        ? Math.floor(
            (Date.now() - account.warmupStartedAt.getTime()) / (24 * 60 * 60 * 1000)
          )
        : 0

      // Calculate expected phase
      const expectedPhase = account.warmupStartedAt
        ? calculatePhase(account.warmupStartedAt)
        : 'NOT_STARTED'

      // Calculate progress percentage
      let progressPercent = 0
      if (account.warmupStatus === 'COMPLETED') {
        progressPercent = 100
      } else if (account.warmupStartedAt) {
        progressPercent = Math.min((daysInWarmup / 30) * 100, 99)
      }

      // Parse progress data
      const progress = account.warmupProgress as any
      const recentActions = progress?.daily?.slice(-7) || []

      return {
        id: account.id,
        username: account.username,
        karma: currentKarma,
        status: account.warmupStatus,
        isActive: account.connected,
        daysInWarmup,
        progressPercent: Math.floor(progressPercent),
        expectedPhase,
        startedAt: account.warmupStartedAt,
        completedAt: account.warmupCompletedAt,
        recentActions,
        totalActions: progress?.daily?.reduce(
          (sum: number, day: any) => sum + (day.actions?.length || 0),
          0
        ) || 0,
      }
    }));

    return NextResponse.json({
      accounts: enrichedAccounts,
      summary: {
        total: accounts.length,
        active: accounts.filter(
          (a) =>
            a.warmupStatus !== 'COMPLETED' &&
            a.warmupStatus !== 'FAILED' &&
            a.warmupStatus !== 'PAUSED'
        ).length,
        completed: accounts.filter((a) => a.warmupStatus === 'COMPLETED').length,
        failed: accounts.filter((a) => a.warmupStatus === 'FAILED').length,
      },
    })
  } catch (error) {
    console.error('Error fetching warmup accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch warmup accounts' },
      { status: 500 }
    )
  }
}

// POST - Start warmup for an existing Reddit account
export async function POST(request: NextRequest) {
  try {
    const user = await getOrCreateUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Please sign in to start warmup' },
        { status: 401 }
      )
    }

    const { accountId } = await request.json()

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      )
    }

    // Verify account exists and belongs to user
    const account = await prisma.redditAccount.findFirst({
      where: { id: accountId, userId: user.id },
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found or access denied' },
        { status: 404 }
      )
    }

    // Check if already in warmup
    if (account.isWarmupAccount && account.warmupStatus !== 'NOT_STARTED') {
      return NextResponse.json(
        { error: 'Account is already in warmup mode' },
        { status: 400 }
      )
    }

    // Start warmup via orchestrator
    const orchestrator = getWarmupOrchestrator()
    await orchestrator.startAccountWarmup(accountId)

    // Get updated account
    const updatedAccount = await prisma.redditAccount.findUnique({
      where: { id: accountId },
    })

    return NextResponse.json({
      success: true,
      account: updatedAccount,
      message: `Warmup started for ${account.username}. First jobs will execute within 30 minutes.`,
    })
  } catch (error) {
    console.error('Error starting warmup:', error)
    return NextResponse.json(
      { error: 'Failed to start warmup' },
      { status: 500 }
    )
  }
}

// PATCH - Update warmup status (pause, resume, stop)
export async function PATCH(request: NextRequest) {
  try {
    const user = await getOrCreateUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Please sign in to update warmup' },
        { status: 401 }
      )
    }

    const { accountId, action } = await request.json()

    if (!accountId || !action) {
      return NextResponse.json(
        { error: 'Account ID and action are required' },
        { status: 400 }
      )
    }

    // Verify account exists and belongs to user
    const account = await prisma.redditAccount.findFirst({
      where: { id: accountId, userId: user.id },
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found or access denied' },
        { status: 404 }
      )
    }

    const orchestrator = getWarmupOrchestrator()

    switch (action) {
      case 'pause':
        await orchestrator.pauseAccountWarmup(accountId)
        break

      case 'resume':
        await orchestrator.resumeAccountWarmup(accountId)
        break

      case 'stop':
        await orchestrator.stopAccountWarmup(accountId)
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be pause, resume, or stop' },
          { status: 400 }
        )
    }

    // Get updated account
    const updatedAccount = await prisma.redditAccount.findUnique({
      where: { id: accountId },
    })

    return NextResponse.json({
      success: true,
      account: updatedAccount,
      message: `Warmup ${action}${action.endsWith('e') ? 'd' : 'ped'} for ${account.username}`,
    })
  } catch (error) {
    console.error('Error updating warmup status:', error)
    return NextResponse.json(
      { error: 'Failed to update warmup status' },
      { status: 500 }
    )
  }
}

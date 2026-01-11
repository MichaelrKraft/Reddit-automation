import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'

// GET: Account health metrics for admin dashboard
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const now = new Date()
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Get accounts grouped by warmup status
    const accountsByPhase = await prisma.redditAccount.groupBy({
      by: ['warmupStatus'],
      _count: true
    })

    // Format phase distribution
    const phaseDistribution: Record<string, number> = {
      NOT_STARTED: 0,
      PHASE_1_UPVOTES: 0,
      PHASE_2_COMMENTS: 0,
      PHASE_3_POSTS: 0,
      PHASE_4_MIXED: 0,
      COMPLETED: 0,
      PAUSED: 0,
      FAILED: 0
    }

    accountsByPhase.forEach(phase => {
      phaseDistribution[phase.warmupStatus] = phase._count
    })

    // At-risk accounts: Low karma after 14+ days in warmup
    const atRiskAccounts = await prisma.redditAccount.findMany({
      where: {
        warmupStartedAt: { lte: fourteenDaysAgo },
        warmupStatus: {
          notIn: ['COMPLETED', 'FAILED', 'NOT_STARTED']
        },
        karma: { lt: 20 }
      },
      include: {
        user: {
          select: { email: true }
        }
      },
      orderBy: { karma: 'asc' },
      take: 20
    })

    // Recent failures (last 7 days)
    const recentFailures = await prisma.redditAccount.findMany({
      where: {
        warmupStatus: 'FAILED',
        updatedAt: { gte: sevenDaysAgo }
      },
      include: {
        user: {
          select: { email: true }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 10
    })

    // Shadowban alerts: Posts with 0 engagement after 24h
    const shadowbanAlerts = await prisma.post.findMany({
      where: {
        status: 'posted',
        postedAt: { lte: twentyFourHoursAgo },
        analytics: {
          score: 0,
          commentCount: 0
        }
      },
      include: {
        account: {
          select: { username: true }
        },
        subreddit: {
          select: { name: true }
        },
        analytics: true
      },
      orderBy: { postedAt: 'desc' },
      take: 10
    })

    // Phase progression over last 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Get completion timestamps
    const completions = await prisma.redditAccount.findMany({
      where: {
        warmupCompletedAt: { gte: thirtyDaysAgo }
      },
      select: {
        warmupCompletedAt: true
      }
    })

    // Group completions by date
    const completionsByDate: Record<string, number> = {}
    completions.forEach(acc => {
      if (acc.warmupCompletedAt) {
        const dateKey = acc.warmupCompletedAt.toISOString().split('T')[0]
        completionsByDate[dateKey] = (completionsByDate[dateKey] || 0) + 1
      }
    })

    // Build 30-day trend
    const phaseProgression = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateKey = date.toISOString().split('T')[0]
      phaseProgression.push({
        date: dateKey,
        completed: completionsByDate[dateKey] || 0
      })
    }

    // Summary stats
    const totalAccounts = Object.values(phaseDistribution).reduce((a, b) => a + b, 0)
    const activeWarmup = phaseDistribution.PHASE_1_UPVOTES +
                         phaseDistribution.PHASE_2_COMMENTS +
                         phaseDistribution.PHASE_3_POSTS +
                         phaseDistribution.PHASE_4_MIXED
    const completionRate = totalAccounts > 0
      ? Math.round((phaseDistribution.COMPLETED / totalAccounts) * 100)
      : 0
    const failureRate = totalAccounts > 0
      ? Math.round((phaseDistribution.FAILED / totalAccounts) * 100)
      : 0

    return NextResponse.json({
      summary: {
        totalAccounts,
        activeWarmup,
        completed: phaseDistribution.COMPLETED,
        failed: phaseDistribution.FAILED,
        completionRate,
        failureRate
      },
      byPhase: phaseDistribution,
      atRiskAccounts: atRiskAccounts.map(acc => ({
        id: acc.id,
        username: acc.username,
        email: acc.user.email,
        karma: acc.karma,
        warmupStatus: acc.warmupStatus,
        warmupStartedAt: acc.warmupStartedAt,
        daysInWarmup: acc.warmupStartedAt
          ? Math.floor((now.getTime() - acc.warmupStartedAt.getTime()) / (24 * 60 * 60 * 1000))
          : 0
      })),
      recentFailures: recentFailures.map(acc => ({
        id: acc.id,
        username: acc.username,
        email: acc.user.email,
        karma: acc.karma,
        updatedAt: acc.updatedAt
      })),
      shadowbanAlerts: shadowbanAlerts.map(post => ({
        id: post.id,
        title: post.title,
        username: post.account.username,
        subreddit: post.subreddit.name,
        postedAt: post.postedAt,
        url: post.url
      })),
      phaseProgression
    })
  } catch (error) {
    console.error('[Admin Account Health] Error:', error)
    if (error instanceof Error && error.message.includes('Admin')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch account health' },
      { status: 500 }
    )
  }
}

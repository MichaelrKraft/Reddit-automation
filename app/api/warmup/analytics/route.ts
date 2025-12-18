import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getOrCreateUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Please sign in to view analytics' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30', 10)

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Get all warmup accounts for user
    const accounts = await prisma.redditAccount.findMany({
      where: {
        userId: user.id,
        isWarmupAccount: true,
        warmupStartedAt: { gte: startDate },
      },
    })

    // Calculate overall statistics
    const totalAccounts = accounts.length
    const completedAccounts = accounts.filter((a) => a.warmupStatus === 'COMPLETED')
    const failedAccounts = accounts.filter((a) => a.warmupStatus === 'FAILED')
    const activeAccounts = accounts.filter(
      (a) =>
        a.warmupStatus !== 'COMPLETED' &&
        a.warmupStatus !== 'FAILED' &&
        a.warmupStatus !== 'PAUSED'
    )

    // Calculate average completion time
    const avgCompletionDays =
      completedAccounts.length > 0
        ? completedAccounts.reduce((sum, a) => {
            if (!a.warmupStartedAt || !a.warmupCompletedAt) return sum
            const duration =
              (a.warmupCompletedAt.getTime() - a.warmupStartedAt.getTime()) /
              (24 * 60 * 60 * 1000)
            return sum + duration
          }, 0) / completedAccounts.length
        : null

    // Calculate success rate
    const successRate =
      totalAccounts > 0
        ? (completedAccounts.length / totalAccounts) * 100
        : 0

    // Calculate failure rate
    const failureRate =
      totalAccounts > 0 ? (failedAccounts.length / totalAccounts) * 100 : 0

    // Calculate average karma at completion
    const avgKarmaAtCompletion =
      completedAccounts.length > 0
        ? completedAccounts.reduce((sum, a) => sum + a.karma, 0) /
          completedAccounts.length
        : null

    // Activity timeline (daily breakdown)
    const timeline: Array<{
      date: string
      started: number
      completed: number
      failed: number
      totalKarma: number
    }> = []

    // Generate timeline for last N days
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]

      const started = accounts.filter((a) => {
        const startDate = a.warmupStartedAt
          ? new Date(a.warmupStartedAt).toISOString().split('T')[0]
          : null
        return startDate === dateStr
      }).length

      const completed = accounts.filter((a) => {
        const completeDate = a.warmupCompletedAt
          ? new Date(a.warmupCompletedAt).toISOString().split('T')[0]
          : null
        return completeDate === dateStr
      }).length

      const failed = accounts.filter((a) => {
        // Check if status changed to FAILED on this date
        // Since we don't track status change dates, we'll estimate
        return (
          a.warmupStatus === 'FAILED' &&
          a.warmupStartedAt &&
          new Date(a.warmupStartedAt).toISOString().split('T')[0] === dateStr
        )
      }).length

      // Calculate total karma gained on this date
      const totalKarma = accounts.reduce((sum, a) => {
        const progress = a.warmupProgress as any
        if (!progress?.daily) return sum

        const dayData = progress.daily.find((d: any) => d.date === dateStr)
        if (!dayData) return sum

        // Estimate karma from actions (rough calculation)
        return sum + (dayData.actions?.length || 0)
      }, 0)

      timeline.push({
        date: dateStr,
        started,
        completed,
        failed,
        totalKarma,
      })
    }

    // Phase distribution
    const phaseDistribution = {
      NOT_STARTED: accounts.filter((a) => a.warmupStatus === 'NOT_STARTED').length,
      PHASE_1_UPVOTES: accounts.filter((a) => a.warmupStatus === 'PHASE_1_UPVOTES')
        .length,
      PHASE_2_COMMENTS: accounts.filter((a) => a.warmupStatus === 'PHASE_2_COMMENTS')
        .length,
      PHASE_3_POSTS: accounts.filter((a) => a.warmupStatus === 'PHASE_3_POSTS').length,
      PHASE_4_MIXED: accounts.filter((a) => a.warmupStatus === 'PHASE_4_MIXED').length,
      COMPLETED: completedAccounts.length,
      PAUSED: accounts.filter((a) => a.warmupStatus === 'PAUSED').length,
      FAILED: failedAccounts.length,
    }

    // Action statistics
    const actionStats = accounts.reduce(
      (stats, account) => {
        const progress = account.warmupProgress as any
        if (!progress?.daily) return stats

        progress.daily.forEach((day: any) => {
          day.actions?.forEach((action: any) => {
            if (action.type === 'upvote') {
              stats.totalUpvotes += action.count || 1
            } else if (action.type === 'comment') {
              stats.totalComments += action.count || 1
            } else if (action.type === 'post') {
              stats.totalPosts += action.count || 1
            }
          })
        })

        return stats
      },
      { totalUpvotes: 0, totalComments: 0, totalPosts: 0 }
    )

    return NextResponse.json({
      summary: {
        totalAccounts,
        activeAccounts: activeAccounts.length,
        completedAccounts: completedAccounts.length,
        failedAccounts: failedAccounts.length,
        successRate: Math.round(successRate * 10) / 10,
        failureRate: Math.round(failureRate * 10) / 10,
        avgCompletionDays: avgCompletionDays
          ? Math.round(avgCompletionDays * 10) / 10
          : null,
        avgKarmaAtCompletion: avgKarmaAtCompletion
          ? Math.round(avgKarmaAtCompletion)
          : null,
      },
      phaseDistribution,
      actionStats,
      timeline,
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}

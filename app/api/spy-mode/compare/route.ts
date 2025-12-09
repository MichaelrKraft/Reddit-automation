import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateAnalytics } from '@/lib/spy-mode/tracker'

// GET - Compare multiple accounts
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'demo-user'
    const { searchParams } = new URL(request.url)
    const accountIds = searchParams.get('ids')?.split(',') || []

    if (accountIds.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 account IDs required for comparison' },
        { status: 400 }
      )
    }

    // Fetch accounts with posts
    const accounts = await prisma.spyAccount.findMany({
      where: {
        id: { in: accountIds },
        userId,
      },
      include: {
        posts: {
          orderBy: { postedAt: 'desc' },
        },
      },
    })

    if (accounts.length < 2) {
      return NextResponse.json(
        { error: 'Could not find all requested accounts' },
        { status: 404 }
      )
    }

    // Calculate comparative metrics for each account
    const comparison = accounts.map(account => {
      const posts = account.posts.map(p => ({
        redditId: p.redditId,
        title: p.title,
        content: p.content,
        url: p.url,
        subreddit: p.subreddit,
        postType: p.postType as 'text' | 'link' | 'image' | 'video',
        score: p.score,
        upvoteRatio: p.upvoteRatio,
        commentCount: p.commentCount,
        awards: p.awards,
        postedAt: p.postedAt,
      }))

      const analytics = calculateAnalytics(posts)

      // Calculate additional radar chart metrics
      const engagement = Math.min(100, (analytics.avgScore + analytics.avgComments * 2) / 10)

      // Consistency: variance in posting frequency
      const consistency = calculateConsistency(posts)

      // Volume score based on posts per week
      const volume = Math.min(100, analytics.postsPerWeek * 10)

      // Success rate already in %
      const successRate = analytics.successRate

      // Timing score: % of posts at peak hours (top 6 hours)
      const timingScore = calculateTimingScore(analytics.postingHeatmap)

      // Diversity: unique subreddits
      const diversity = Math.min(100, analytics.topSubreddits.length * 10)

      return {
        id: account.id,
        username: account.username,
        avatarUrl: account.avatarUrl,
        totalKarma: account.totalKarma,
        analytics,
        radarMetrics: {
          engagement: Math.round(engagement),
          consistency: Math.round(consistency),
          volume: Math.round(volume),
          successRate: Math.round(successRate),
          timing: Math.round(timingScore),
          diversity: Math.round(diversity),
        },
      }
    })

    // Build comparison table data
    const metrics = [
      { key: 'avgScore', label: 'Avg Score' },
      { key: 'avgComments', label: 'Avg Comments' },
      { key: 'postsPerWeek', label: 'Posts/Week' },
      { key: 'successRate', label: 'Success Rate' },
      { key: 'totalPosts', label: 'Total Posts' },
    ]

    const tableData = metrics.map(metric => {
      const row: Record<string, string | number> = { metric: metric.label }

      comparison.forEach((c, idx) => {
        const analytics = c.analytics as unknown as Record<string, unknown>
        const value = analytics[metric.key]
        if (typeof value === 'number') {
          row[`account_${idx}`] = metric.key === 'successRate' ? `${value}%` : value
        } else if (typeof value === 'string') {
          row[`account_${idx}`] = value
        } else {
          row[`account_${idx}`] = String(value ?? '')
        }
      })

      // Calculate diff if 2 accounts
      if (comparison.length === 2) {
        const analytics0 = comparison[0].analytics as unknown as Record<string, unknown>
        const analytics1 = comparison[1].analytics as unknown as Record<string, unknown>
        const val1 = analytics0[metric.key]
        const val2 = analytics1[metric.key]

        if (typeof val1 === 'number' && typeof val2 === 'number' && val2 !== 0) {
          const diff = Math.round(((val1 - val2) / val2) * 100)
          row.diff = diff > 0 ? `+${diff}%` : `${diff}%`
        }
      }

      return row
    })

    return NextResponse.json({
      accounts: comparison,
      tableData,
    })
  } catch (error) {
    console.error('Error comparing accounts:', error)
    return NextResponse.json(
      { error: 'Failed to compare accounts' },
      { status: 500 }
    )
  }
}

// Calculate posting consistency (0-100)
function calculateConsistency(posts: { postedAt: Date }[]): number {
  if (posts.length < 5) return 50

  // Group posts by week
  const weeklyPosts = new Map<string, number>()
  posts.forEach(p => {
    const week = getWeekKey(p.postedAt)
    weeklyPosts.set(week, (weeklyPosts.get(week) || 0) + 1)
  })

  if (weeklyPosts.size < 2) return 100

  const counts = Array.from(weeklyPosts.values())
  const avg = counts.reduce((a, b) => a + b, 0) / counts.length
  const variance = counts.reduce((sum, c) => sum + Math.pow(c - avg, 2), 0) / counts.length
  const stdDev = Math.sqrt(variance)

  // Lower standard deviation = higher consistency
  const cv = stdDev / avg // Coefficient of variation
  return Math.max(0, Math.min(100, 100 - cv * 50))
}

function getWeekKey(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().slice(0, 10)
}

// Calculate timing score (0-100) based on posting at peak hours
function calculateTimingScore(
  heatmap: { day: number; hour: number; count: number; avgScore: number }[]
): number {
  if (heatmap.length === 0) return 50

  // Sort by average score to find peak times
  const sorted = [...heatmap].sort((a, b) => b.avgScore - a.avgScore)
  const peakTimes = sorted.slice(0, 6)
  const peakKeys = new Set(peakTimes.map(t => `${t.day}-${t.hour}`))

  // Calculate what % of posts are at peak times
  const totalPosts = heatmap.reduce((sum, h) => sum + h.count, 0)
  const peakPosts = peakTimes.reduce((sum, h) => sum + h.count, 0)

  return totalPosts > 0 ? (peakPosts / totalPosts) * 100 : 50
}

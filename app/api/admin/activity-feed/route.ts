import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'

interface Activity {
  id: string
  type: 'signup' | 'post_published' | 'reddit_connected' | 'warmup_completed' | 'warmup_failed' | 'payment' | 'spy_created' | 'keyword_added'
  user: string
  details: string
  timestamp: Date
  metadata?: Record<string, unknown>
}

// GET: Fetch recent platform activity
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Fetch activities from multiple sources in parallel
    const [
      recentSignups,
      recentPosts,
      recentRedditAccounts,
      recentWarmupCompleted,
      recentWarmupFailed,
      recentSpyAccounts,
      recentKeywords
    ] = await Promise.all([
      // Recent signups
      prisma.user.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: {
          id: true,
          email: true,
          tier: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      }),

      // Recent posts published
      prisma.post.findMany({
        where: {
          postedAt: { not: null, gte: sevenDaysAgo }
        },
        select: {
          id: true,
          title: true,
          postedAt: true,
          subreddit: {
            select: { name: true }
          },
          account: {
            select: {
              user: {
                select: { email: true }
              }
            }
          }
        },
        orderBy: { postedAt: 'desc' },
        take: limit
      }),

      // Recent Reddit accounts connected
      prisma.redditAccount.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: {
          id: true,
          username: true,
          createdAt: true,
          user: {
            select: { email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      }),

      // Recent warmup completions
      prisma.redditAccount.findMany({
        where: {
          warmupStatus: 'COMPLETED',
          warmupCompletedAt: { not: null, gte: sevenDaysAgo }
        },
        select: {
          id: true,
          username: true,
          warmupCompletedAt: true,
          user: {
            select: { email: true }
          }
        },
        orderBy: { warmupCompletedAt: 'desc' },
        take: limit
      }),

      // Recent warmup failures
      prisma.redditAccount.findMany({
        where: {
          warmupStatus: 'FAILED',
          updatedAt: { gte: sevenDaysAgo }
        },
        select: {
          id: true,
          username: true,
          updatedAt: true,
          user: {
            select: { email: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: limit
      }),

      // Recent spy accounts created
      prisma.spyAccount.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: {
          id: true,
          username: true,
          createdAt: true,
          user: {
            select: { email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      }),

      // Recent keywords added
      prisma.brandKeyword.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: {
          id: true,
          keyword: true,
          createdAt: true,
          user: {
            select: { email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      })
    ])

    // Transform to unified activity format
    const activities: Activity[] = []

    // Add signups
    for (const signup of recentSignups) {
      activities.push({
        id: `signup-${signup.id}`,
        type: 'signup',
        user: signup.email,
        details: `New ${signup.tier} user signed up`,
        timestamp: signup.createdAt,
        metadata: { tier: signup.tier }
      })
    }

    // Add posts
    for (const post of recentPosts) {
      if (post.postedAt) {
        const subredditName = post.subreddit.name
        activities.push({
          id: `post-${post.id}`,
          type: 'post_published',
          user: post.account.user.email,
          details: `Posted "${post.title?.slice(0, 50)}${post.title && post.title.length > 50 ? '...' : ''}" to r/${subredditName}`,
          timestamp: post.postedAt,
          metadata: { subreddit: subredditName, title: post.title }
        })
      }
    }

    // Add Reddit accounts connected
    for (const account of recentRedditAccounts) {
      activities.push({
        id: `reddit-${account.id}`,
        type: 'reddit_connected',
        user: account.user.email,
        details: `Connected Reddit account u/${account.username}`,
        timestamp: account.createdAt,
        metadata: { username: account.username }
      })
    }

    // Add warmup completions
    for (const account of recentWarmupCompleted) {
      if (account.warmupCompletedAt) {
        activities.push({
          id: `warmup-complete-${account.id}`,
          type: 'warmup_completed',
          user: account.user.email,
          details: `Warmup completed for u/${account.username}`,
          timestamp: account.warmupCompletedAt,
          metadata: { username: account.username }
        })
      }
    }

    // Add warmup failures
    for (const account of recentWarmupFailed) {
      activities.push({
        id: `warmup-failed-${account.id}`,
        type: 'warmup_failed',
        user: account.user.email,
        details: `Warmup failed for u/${account.username}`,
        timestamp: account.updatedAt,
        metadata: { username: account.username }
      })
    }

    // Add spy accounts
    for (const spy of recentSpyAccounts) {
      activities.push({
        id: `spy-${spy.id}`,
        type: 'spy_created',
        user: spy.user.email,
        details: `Started spying on u/${spy.username}`,
        timestamp: spy.createdAt,
        metadata: { username: spy.username }
      })
    }

    // Add keywords
    for (const keyword of recentKeywords) {
      activities.push({
        id: `keyword-${keyword.id}`,
        type: 'keyword_added',
        user: keyword.user.email,
        details: `Added keyword "${keyword.keyword}"`,
        timestamp: keyword.createdAt,
        metadata: { keyword: keyword.keyword }
      })
    }

    // Sort all activities by timestamp descending
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    // Take only the requested limit
    const limitedActivities = activities.slice(0, limit)

    // Calculate activity summary
    const summary = {
      total: limitedActivities.length,
      signups: limitedActivities.filter(a => a.type === 'signup').length,
      postsPublished: limitedActivities.filter(a => a.type === 'post_published').length,
      redditConnected: limitedActivities.filter(a => a.type === 'reddit_connected').length,
      warmupCompleted: limitedActivities.filter(a => a.type === 'warmup_completed').length,
      warmupFailed: limitedActivities.filter(a => a.type === 'warmup_failed').length
    }

    return NextResponse.json({
      activities: limitedActivities,
      summary,
      timeRange: {
        from: sevenDaysAgo.toISOString(),
        to: now.toISOString()
      }
    })
  } catch (error) {
    console.error('[Admin Activity Feed] Error:', error)
    if (error instanceof Error && error.message.includes('Admin')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch activity feed' },
      { status: 500 }
    )
  }
}

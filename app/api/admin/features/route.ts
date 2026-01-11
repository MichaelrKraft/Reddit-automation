import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'

// Feature page mappings
const featurePages: Record<string, string> = {
  warmup: '/dashboard/warmup',
  'spy-mode': '/dashboard/spy-mode',
  viral: '/dashboard/viral',
  timing: '/dashboard/timing',
  'speed-alerts': '/dashboard/speed-alerts',
  opportunities: '/dashboard/opportunities',
  'keyword-alerts': '/dashboard/keyword-alerts',
  'seo-finder': '/dashboard/seo-finder',
  leaderboard: '/dashboard/leaderboard',
  analytics: '/dashboard/analytics',
  'new-post': '/dashboard/new-post',
  posts: '/dashboard/posts',
  drafts: '/dashboard/drafts',
  calendar: '/dashboard/calendar',
  comments: '/dashboard/comments',
  discover: '/dashboard/discover',
  analyze: '/dashboard/analyze'
}

// GET: Feature usage breakdown (admin only)
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '30')

    const since = new Date()
    since.setDate(since.getDate() - days)

    const totalUsers = await prisma.user.count()

    // Get page view counts for each feature
    const featureUsage = await Promise.all(
      Object.entries(featurePages).map(async ([feature, path]) => {
        // Unique users who visited this feature
        const uniqueUsers = await prisma.pageView.groupBy({
          by: ['userId'],
          where: {
            page: { contains: path },
            timestamp: { gte: since }
          }
        })

        // Total page views
        const totalViews = await prisma.pageView.count({
          where: {
            page: { contains: path },
            timestamp: { gte: since }
          }
        })

        // First-time visitors (feature discovery)
        const firstVisits = await prisma.userEvent.count({
          where: {
            eventName: `feature_first_visit_${feature}`,
            timestamp: { gte: since }
          }
        })

        return {
          feature,
          path,
          uniqueUsers: uniqueUsers.length,
          totalViews,
          firstVisits,
          adoptionRate: totalUsers > 0
            ? Math.round((uniqueUsers.length / totalUsers) * 100)
            : 0
        }
      })
    )

    // Sort by unique users (most used first)
    featureUsage.sort((a, b) => b.uniqueUsers - a.uniqueUsers)

    // Get conversion funnel data
    const [
      dashboardVisitors,
      redditConnectors,
      postStarters,
      postCompletors
    ] = await Promise.all([
      // Users who visited dashboard
      prisma.pageView.groupBy({
        by: ['userId'],
        where: {
          page: '/dashboard',
          timestamp: { gte: since }
        }
      }).then(r => r.length),

      // Users who started Reddit connection
      prisma.userEvent.groupBy({
        by: ['userId'],
        where: {
          eventName: 'reddit_connect_started',
          timestamp: { gte: since }
        }
      }).then(r => r.length),

      // Users who started post creation
      prisma.userEvent.groupBy({
        by: ['userId'],
        where: {
          eventName: 'post_create_started',
          timestamp: { gte: since }
        }
      }).then(r => r.length),

      // Users who completed post creation
      prisma.userEvent.groupBy({
        by: ['userId'],
        where: {
          eventName: 'post_create_schedule',
          timestamp: { gte: since }
        }
      }).then(r => r.length)
    ])

    // Calculate drop-off rates
    const dropOff = {
      dashboardToRedditConnect: dashboardVisitors > 0
        ? Math.round(((dashboardVisitors - redditConnectors) / dashboardVisitors) * 100)
        : 0,
      dashboardToPostStart: dashboardVisitors > 0
        ? Math.round(((dashboardVisitors - postStarters) / dashboardVisitors) * 100)
        : 0,
      postStartToComplete: postStarters > 0
        ? Math.round(((postStarters - postCompletors) / postStarters) * 100)
        : 0
    }

    // Get abandoned post creation steps
    const abandonedSteps = await prisma.userEvent.groupBy({
      by: ['metadata'],
      where: {
        eventName: 'post_create_abandoned',
        timestamp: { gte: since }
      },
      _count: true
    })

    return NextResponse.json({
      period: {
        days,
        since: since.toISOString()
      },
      totalUsers,
      featureUsage,
      conversionFunnel: {
        dashboardVisitors,
        redditConnectors,
        postStarters,
        postCompletors,
        dropOff
      },
      postCreationAbandonment: abandonedSteps.map(step => ({
        lastStep: (step.metadata as { lastStep?: number })?.lastStep || 'unknown',
        count: step._count
      }))
    })
  } catch (error) {
    console.error('[Admin Features] Error fetching feature usage:', error)
    if (error instanceof Error && error.message.includes('Admin')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch feature usage' },
      { status: 500 }
    )
  }
}

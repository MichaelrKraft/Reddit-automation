import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'

// GET: Overall platform stats (admin only)
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // User counts
    const [
      totalUsers,
      newUsers24h,
      newUsers7d,
      newUsers30d,
      founderUsers,
      alphaUsers,
      lifetimeDealUsers
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: oneDayAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count({ where: { tier: 'FOUNDER' } }),
      prisma.user.count({ where: { tier: 'ALPHA' } }),
      prisma.user.count({ where: { hasLifetimeDeal: true } })
    ])

    // Active users (based on page views)
    const [dau, wau, mau] = await Promise.all([
      prisma.pageView.groupBy({
        by: ['userId'],
        where: { timestamp: { gte: oneDayAgo } }
      }).then(r => r.length),
      prisma.pageView.groupBy({
        by: ['userId'],
        where: { timestamp: { gte: sevenDaysAgo } }
      }).then(r => r.length),
      prisma.pageView.groupBy({
        by: ['userId'],
        where: { timestamp: { gte: thirtyDaysAgo } }
      }).then(r => r.length)
    ])

    // Feature usage counts
    const [
      totalRedditAccounts,
      totalPosts,
      totalDrafts,
      totalSpyAccounts,
      totalOpportunities,
      totalKeywords
    ] = await Promise.all([
      prisma.redditAccount.count(),
      prisma.post.count(),
      prisma.draftPost.count(),
      prisma.spyAccount.count(),
      prisma.opportunity.count(),
      prisma.userKeyword.count()
    ])

    // Users with connected Reddit accounts
    const usersWithRedditAccounts = await prisma.user.count({
      where: {
        redditAccounts: {
          some: {}
        }
      }
    })

    // Users who have created posts
    const usersWithPosts = await prisma.redditAccount.groupBy({
      by: ['userId'],
      where: {
        posts: {
          some: {}
        }
      }
    }).then(r => r.length)

    // Recent signups (last 10)
    const recentSignups = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        tier: true,
        signupNumber: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    // Event summary (last 24h)
    const eventSummary = await prisma.userEvent.groupBy({
      by: ['eventName'],
      where: { timestamp: { gte: oneDayAgo } },
      _count: true,
      orderBy: { _count: { eventName: 'desc' } },
      take: 10
    })

    return NextResponse.json({
      users: {
        total: totalUsers,
        new24h: newUsers24h,
        new7d: newUsers7d,
        new30d: newUsers30d,
        byTier: {
          founder: founderUsers,
          alpha: alphaUsers
        },
        lifetimeDeal: lifetimeDealUsers
      },
      activeUsers: {
        dau,
        wau,
        mau
      },
      features: {
        redditAccounts: totalRedditAccounts,
        posts: totalPosts,
        drafts: totalDrafts,
        spyAccounts: totalSpyAccounts,
        opportunities: totalOpportunities,
        keywords: totalKeywords
      },
      conversion: {
        usersWithRedditAccounts,
        usersWithPosts,
        redditConnectionRate: totalUsers > 0
          ? Math.round((usersWithRedditAccounts / totalUsers) * 100)
          : 0,
        postCreationRate: totalUsers > 0
          ? Math.round((usersWithPosts / totalUsers) * 100)
          : 0
      },
      recentSignups,
      topEvents24h: eventSummary.map(e => ({
        eventName: e.eventName,
        count: e._count
      }))
    })
  } catch (error) {
    console.error('[Admin Stats] Error fetching stats:', error)
    if (error instanceof Error && error.message.includes('Admin')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}

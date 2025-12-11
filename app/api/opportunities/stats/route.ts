import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()

    // Get date ranges
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Fetch all stats in parallel
    const [
      totalOpportunities,
      newThisWeek,
      statusCounts,
      categoryCounts,
      avgScore,
      topScoring,
      trendingUp,
      recentActions,
      subredditBreakdown,
    ] = await Promise.all([
      // Total opportunities
      prisma.opportunity.count({
        where: { userId: user.id },
      }),

      // New this week
      prisma.opportunity.count({
        where: {
          userId: user.id,
          createdAt: { gte: oneWeekAgo },
        },
      }),

      // Count by status
      prisma.opportunity.groupBy({
        by: ['status'],
        where: { userId: user.id },
        _count: { status: true },
      }),

      // Count by category
      prisma.opportunity.groupBy({
        by: ['category'],
        where: { userId: user.id },
        _count: { category: true },
      }),

      // Average score
      prisma.opportunity.aggregate({
        where: { userId: user.id },
        _avg: { score: true },
      }),

      // Top 5 highest scoring
      prisma.opportunity.findMany({
        where: { userId: user.id },
        orderBy: { score: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          score: true,
          category: true,
          status: true,
        },
      }),

      // Trending up opportunities
      prisma.opportunity.count({
        where: {
          userId: user.id,
          trendDirection: 'GROWING',
        },
      }),

      // Recent actions this month
      prisma.opportunityAction.count({
        where: {
          userId: user.id,
          createdAt: { gte: oneMonthAgo },
        },
      }),

      // Top subreddits with opportunities
      prisma.opportunitySubreddit.groupBy({
        by: ['subreddit'],
        where: {
          opportunity: { userId: user.id },
        },
        _sum: { mentionCount: true },
        orderBy: { _sum: { mentionCount: 'desc' } },
        take: 10,
      }),
    ])

    // Transform status counts
    const statusMap: Record<string, number> = {}
    statusCounts.forEach((s) => {
      statusMap[s.status] = s._count.status
    })

    // Transform category counts
    const categoryMap: Record<string, number> = {}
    categoryCounts.forEach((c) => {
      categoryMap[c.category] = c._count.category
    })

    return NextResponse.json({
      stats: {
        total: totalOpportunities,
        newThisWeek,
        avgScore: Math.round(avgScore._avg.score || 0),
        trendingUp,
        actionsThisMonth: recentActions,
        byStatus: {
          new: statusMap['NEW'] || 0,
          tracking: statusMap['TRACKING'] || 0,
          actedOn: statusMap['ACTED_ON'] || 0,
          archived: statusMap['ARCHIVED'] || 0,
        },
        byCategory: {
          painPoint: categoryMap['PAIN_POINT'] || 0,
          featureRequest: categoryMap['FEATURE_REQUEST'] || 0,
          contentOpportunity: categoryMap['CONTENT_OPPORTUNITY'] || 0,
          competitorGap: categoryMap['COMPETITOR_GAP'] || 0,
          trendingTopic: categoryMap['TRENDING_TOPIC'] || 0,
        },
      },
      topOpportunities: topScoring,
      topSubreddits: subredditBreakdown.map((s) => ({
        subreddit: s.subreddit,
        mentionCount: s._sum.mentionCount || 0,
      })),
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'

// GET - List opportunities with filtering
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()
    const userId = user.id
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const sortBy = searchParams.get('sortBy') || 'newest'

    // Simple where clause
    const where: any = { userId }

    // Build orderBy - for upvotes/comments, we'll sort after fetching
    let orderBy: any = { firstSeenAt: 'desc' }
    const needsPostFetchSort = sortBy === 'upvotes' || sortBy === 'comments'

    if (!needsPostFetchSort) {
      switch (sortBy) {
        case 'newest':
          orderBy = { firstSeenAt: 'desc' }
          break
        case 'oldest':
          orderBy = { firstSeenAt: 'asc' }
          break
        case 'confidence':
          orderBy = { score: 'desc' }
          break
        case 'evidence':
          orderBy = { evidenceCount: 'desc' }
          break
      }
    }

    // Get total count
    const total = await prisma.opportunity.count({ where })

    // Get opportunities - fetch more if we need to sort post-fetch
    let opportunities = await prisma.opportunity.findMany({
      where,
      include: {
        evidence: {
          orderBy: { upvotes: 'desc' },
          take: 3,
        },
        subreddits: true,
        actions: {
          where: { userId },
        },
      },
      orderBy,
      skip: needsPostFetchSort ? 0 : (page - 1) * limit,
      take: needsPostFetchSort ? total : limit,
    })

    // Post-fetch sorting for upvotes/comments (based on top evidence)
    if (needsPostFetchSort) {
      opportunities = opportunities.sort((a, b) => {
        const aEvidence = a.evidence[0]
        const bEvidence = b.evidence[0]

        if (sortBy === 'upvotes') {
          return (bEvidence?.upvotes || 0) - (aEvidence?.upvotes || 0)
        } else {
          return (bEvidence?.commentCount || 0) - (aEvidence?.commentCount || 0)
        }
      })

      // Apply pagination after sorting
      opportunities = opportunities.slice((page - 1) * limit, page * limit)
    }

    // Get unique subreddits for the filter display
    const subredditCounts = await prisma.opportunitySubreddit.groupBy({
      by: ['subreddit'],
      where: {
        opportunity: { userId },
      },
      _count: { subreddit: true },
      orderBy: { _count: { subreddit: 'desc' } },
      take: 20,
    })

    const subredditFilters = subredditCounts.map(s => ({
      name: s.subreddit,
      count: s._count.subreddit,
    }))

    // Get category counts from opportunities
    const categoryCounts = await prisma.opportunity.groupBy({
      by: ['category'],
      where: { userId },
      _count: { category: true },
      orderBy: { _count: { category: 'desc' } },
    })

    // Map enum values to display names
    const categoryDisplayMap: Record<string, string> = {
      'PAIN_POINT': 'Productivity',
      'FEATURE_REQUEST': 'Business Tools & SaaS',
      'CONTENT_OPPORTUNITY': 'Education & Self Improvement',
      'COMPETITOR_GAP': 'Developer Tools',
      'TRENDING_TOPIC': 'Media & Entertainment',
    }

    const categoryFilters = categoryCounts.map(c => ({
      name: categoryDisplayMap[c.category] || c.category,
      count: c._count.category,
    }))

    return NextResponse.json({
      opportunities: opportunities.map(formatOpportunity),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        categories: categoryFilters,
        subreddits: subredditFilters,
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching opportunities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch opportunities' },
      { status: 500 }
    )
  }
}

function formatOpportunity(opp: any) {
  const metadata = opp.metadata as any || {}
  return {
    id: opp.id,
    title: opp.title,
    category: metadata.displayCategory || mapEnumToCategory(opp.category),
    confidence: metadata.confidence || opp.score,
    opportunityText: opp.problemStatement,
    status: opp.status,
    evidenceCount: opp.evidenceCount,
    trendDirection: opp.trendDirection,
    createdAt: opp.firstSeenAt,
    updatedAt: opp.lastUpdatedAt,
    subreddits: opp.subreddits?.map((s: any) => s.subreddit) || [],
    evidence: opp.evidence?.map((e: any) => ({
      id: e.id,
      postUrl: e.redditPostUrl,
      title: e.quoteText,
      author: e.author,
      subreddit: e.subreddit,
      score: e.upvotes,
      comments: e.commentCount,
      postedAt: e.postedAt,
    })) || [],
    isBookmarked: opp.actions?.some((a: any) => a.actionType === 'BOOKMARK'),
    isTracking: opp.status === 'TRACKING',
    isActedOn: opp.status === 'ACTED_ON',
  }
}

function mapEnumToCategory(enumVal: string): string {
  const map: Record<string, string> = {
    'PAIN_POINT': 'Productivity',
    'FEATURE_REQUEST': 'Business Tools & SaaS',
    'CONTENT_OPPORTUNITY': 'Education & Self Improvement',
    'COMPETITOR_GAP': 'Business Tools & SaaS',
    'TRENDING_TOPIC': 'Other',
  }
  return map[enumVal] || 'Other'
}

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

    // Build orderBy
    let orderBy: any = { firstSeenAt: 'desc' }
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

    // Get total count
    const total = await prisma.opportunity.count({ where })

    // Get opportunities
    const opportunities = await prisma.opportunity.findMany({
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
      skip: (page - 1) * limit,
      take: limit,
    })

    return NextResponse.json({
      opportunities: opportunities.map(formatOpportunity),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        categories: [],
        subreddits: [],
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

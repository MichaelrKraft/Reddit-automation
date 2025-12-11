import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { OpportunityCategory, OpportunityStatus, TrendDirection } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const status = searchParams.get('status') as OpportunityStatus | null
    const category = searchParams.get('category') as OpportunityCategory | null
    const minScore = searchParams.get('minScore')
    const maxScore = searchParams.get('maxScore')
    const sortBy = searchParams.get('sortBy') || 'score'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search')

    // Build where clause
    const where: any = {
      userId: user.id,
    }

    if (status) {
      where.status = status
    }

    if (category) {
      where.category = category
    }

    if (minScore || maxScore) {
      where.score = {}
      if (minScore) where.score.gte = parseInt(minScore)
      if (maxScore) where.score.lte = parseInt(maxScore)
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { problemStatement: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Build order by
    const orderBy: any = {}
    if (sortBy === 'score') {
      orderBy.score = sortOrder
    } else if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder
    } else if (sortBy === 'evidenceCount') {
      orderBy.evidenceCount = sortOrder
    } else {
      orderBy.score = 'desc'
    }

    // Get total count for pagination
    const total = await prisma.opportunity.count({ where })

    // Fetch opportunities with earliest evidence date
    const opportunities = await prisma.opportunity.findMany({
      where,
      include: {
        subreddits: {
          orderBy: { mentionCount: 'desc' },
          take: 5,
        },
        evidence: {
          orderBy: { postedAt: 'asc' },
          take: 1,
          select: { postedAt: true },
        },
        _count: {
          select: { evidence: true, actions: true },
        },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    })

    // Transform to include earliestPostDate
    const transformedOpportunities = opportunities.map((opp) => ({
      ...opp,
      earliestPostDate: opp.evidence[0]?.postedAt || null,
      evidence: undefined, // Remove evidence array from response
    }))

    return NextResponse.json({
      opportunities: transformedOpportunities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching opportunities:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await request.json()

    const {
      title,
      category,
      score,
      problemStatement,
      trendDirection = 'STABLE',
      metadata = {},
    } = body

    // Validate required fields
    if (!title || !category || score === undefined || !problemStatement) {
      return NextResponse.json(
        { error: 'Missing required fields: title, category, score, problemStatement' },
        { status: 400 }
      )
    }

    // Validate category enum
    if (!Object.values(OpportunityCategory).includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${Object.values(OpportunityCategory).join(', ')}` },
        { status: 400 }
      )
    }

    // Validate score range
    if (score < 0 || score > 100) {
      return NextResponse.json(
        { error: 'Score must be between 0 and 100' },
        { status: 400 }
      )
    }

    // Create the opportunity
    const opportunity = await prisma.opportunity.create({
      data: {
        title,
        category: category as OpportunityCategory,
        score,
        problemStatement,
        trendDirection: trendDirection as TrendDirection,
        status: 'NEW',
        metadata,
        userId: user.id,
      },
      include: {
        subreddits: true,
        _count: {
          select: { evidence: true },
        },
      },
    })

    return NextResponse.json({ opportunity }, { status: 201 })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error creating opportunity:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

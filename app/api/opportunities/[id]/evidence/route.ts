import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const subreddit = searchParams.get('subreddit')

    // Verify ownership
    const opportunity = await prisma.opportunity.findFirst({
      where: { id, userId: user.id },
    })

    if (!opportunity) {
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: 404 }
      )
    }

    // Build where clause
    const where: any = {
      opportunityId: id,
    }

    if (subreddit) {
      where.subreddit = subreddit
    }

    // Get total count
    const total = await prisma.opportunityEvidence.count({ where })

    // Fetch evidence
    const evidence = await prisma.opportunityEvidence.findMany({
      where,
      orderBy: { postedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    return NextResponse.json({
      evidence,
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
    console.error('Error fetching evidence:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = await request.json()

    // Verify ownership
    const opportunity = await prisma.opportunity.findFirst({
      where: { id, userId: user.id },
    })

    if (!opportunity) {
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: 404 }
      )
    }

    const {
      redditPostId,
      redditPostUrl,
      quoteText,
      author,
      subreddit,
      upvotes = 0,
      commentCount = 0,
      sentimentScore,
      postedAt,
    } = body

    // Validate required fields
    if (!redditPostId || !redditPostUrl || !quoteText || !subreddit || !postedAt) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create the evidence
    const evidence = await prisma.opportunityEvidence.create({
      data: {
        redditPostId,
        redditPostUrl,
        quoteText,
        author,
        subreddit,
        upvotes,
        commentCount,
        sentimentScore,
        postedAt: new Date(postedAt),
        opportunityId: id,
      },
    })

    // Update evidence count on opportunity
    await prisma.opportunity.update({
      where: { id },
      data: {
        evidenceCount: { increment: 1 },
        lastUpdatedAt: new Date(),
      },
    })

    // Update or create subreddit mention
    await prisma.opportunitySubreddit.upsert({
      where: {
        opportunityId_subreddit: {
          opportunityId: id,
          subreddit,
        },
      },
      update: {
        mentionCount: { increment: 1 },
        lastMentionedAt: new Date(),
      },
      create: {
        opportunityId: id,
        subreddit,
        mentionCount: 1,
      },
    })

    return NextResponse.json({ evidence }, { status: 201 })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error adding evidence:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

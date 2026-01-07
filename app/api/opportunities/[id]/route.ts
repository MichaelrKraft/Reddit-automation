import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Get single opportunity details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id') || 'demo-user'
    const { id } = await params

    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
      include: {
        evidence: {
          orderBy: { upvotes: 'desc' },
        },
        subreddits: true,
        actions: {
          where: { userId },
        },
      },
    })

    if (!opportunity) {
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ opportunity: formatOpportunity(opportunity) })
  } catch (error) {
    console.error('Error fetching opportunity:', error)
    return NextResponse.json(
      { error: 'Failed to fetch opportunity' },
      { status: 500 }
    )
  }
}

// PATCH - Update opportunity status (track, archive, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id') || 'demo-user'
    const { id } = await params
    const body = await request.json()
    const { action, status } = body

    // Find the opportunity
    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
    })

    if (!opportunity) {
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: 404 }
      )
    }

    // Handle different actions
    if (action === 'bookmark') {
      // Toggle bookmark
      const existingBookmark = await prisma.opportunityAction.findFirst({
        where: {
          opportunityId: id,
          userId,
          actionType: 'BOOKMARK',
        },
      })

      if (existingBookmark) {
        await prisma.opportunityAction.delete({
          where: { id: existingBookmark.id },
        })
        return NextResponse.json({ success: true, bookmarked: false })
      } else {
        await prisma.opportunityAction.create({
          data: {
            opportunityId: id,
            userId,
            actionType: 'BOOKMARK',
          },
        })
        return NextResponse.json({ success: true, bookmarked: true })
      }
    }

    if (action === 'track') {
      // Set status to TRACKING
      await prisma.opportunity.update({
        where: { id },
        data: { status: 'TRACKING' },
      })
      return NextResponse.json({ success: true, status: 'TRACKING' })
    }

    if (action === 'archive') {
      // Set status to ARCHIVED
      await prisma.opportunity.update({
        where: { id },
        data: { status: 'ARCHIVED' },
      })
      return NextResponse.json({ success: true, status: 'ARCHIVED' })
    }

    if (action === 'acted') {
      // Mark as acted on
      await prisma.opportunity.update({
        where: { id },
        data: { status: 'ACTED_ON' },
      })
      await prisma.opportunityAction.create({
        data: {
          opportunityId: id,
          userId,
          actionType: 'ACTED_UPON',
        },
      })
      return NextResponse.json({ success: true, status: 'ACTED_ON' })
    }

    if (action === 'untrack') {
      // Reset status to NEW
      await prisma.opportunity.update({
        where: { id },
        data: { status: 'NEW' },
      })
      return NextResponse.json({ success: true, status: 'NEW' })
    }

    // Direct status update
    if (status) {
      const validStatuses = ['NEW', 'TRACKING', 'ACTED_ON', 'ARCHIVED']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status' },
          { status: 400 }
        )
      }

      await prisma.opportunity.update({
        where: { id },
        data: { status },
      })
      return NextResponse.json({ success: true, status })
    }

    return NextResponse.json(
      { error: 'No valid action or status provided' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error updating opportunity:', error)
    return NextResponse.json(
      { error: 'Failed to update opportunity' },
      { status: 500 }
    )
  }
}

// DELETE - Delete an opportunity
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id') || 'demo-user'
    const { id } = await params

    // Verify ownership
    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
    })

    if (!opportunity) {
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: 404 }
      )
    }

    if (opportunity.userId !== userId) {
      return NextResponse.json(
        { error: 'Not authorized to delete this opportunity' },
        { status: 403 }
      )
    }

    // Delete (cascades to evidence, subreddits, actions)
    await prisma.opportunity.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting opportunity:', error)
    return NextResponse.json(
      { error: 'Failed to delete opportunity' },
      { status: 500 }
    )
  }
}

function formatOpportunity(opp: any) {
  const metadata = opp.metadata as any || {}
  return {
    id: opp.id,
    title: opp.title,
    category: metadata.displayCategory || opp.category,
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

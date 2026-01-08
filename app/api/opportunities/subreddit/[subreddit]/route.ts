import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'

// DELETE - Remove all opportunities for a subreddit
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ subreddit: string }> }
) {
  try {
    const user = await requireUser()
    const userId = user.id
    const { subreddit: subredditName } = await params

    if (!subredditName) {
      return NextResponse.json({ error: 'Subreddit name required' }, { status: 400 })
    }

    // Find all opportunity IDs that have this subreddit
    const opportunitySubreddits = await prisma.opportunitySubreddit.findMany({
      where: {
        subreddit: subredditName,
        opportunity: { userId },
      },
      select: { opportunityId: true },
    })

    const opportunityIds = opportunitySubreddits.map(os => os.opportunityId)

    if (opportunityIds.length === 0) {
      return NextResponse.json({ message: 'No opportunities found for this subreddit' })
    }

    // Delete related records first (foreign key constraints)
    await prisma.opportunityEvidence.deleteMany({
      where: { opportunityId: { in: opportunityIds } },
    })

    await prisma.opportunitySubreddit.deleteMany({
      where: { opportunityId: { in: opportunityIds } },
    })

    await prisma.opportunityAction.deleteMany({
      where: { opportunityId: { in: opportunityIds } },
    })

    // Delete the opportunities
    const deleted = await prisma.opportunity.deleteMany({
      where: {
        id: { in: opportunityIds },
        userId,
      },
    })

    return NextResponse.json({
      success: true,
      deleted: deleted.count,
      subreddit: subredditName,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error removing subreddit opportunities:', error)
    return NextResponse.json(
      { error: 'Failed to remove subreddit opportunities' },
      { status: 500 }
    )
  }
}

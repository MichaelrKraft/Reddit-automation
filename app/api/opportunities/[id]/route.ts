import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { OpportunityStatus, OpportunityActionType } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params

    const opportunity = await prisma.opportunity.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        evidence: {
          orderBy: { postedAt: 'desc' },
          take: 50,
        },
        subreddits: {
          orderBy: { mentionCount: 'desc' },
        },
        actions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!opportunity) {
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: 404 }
      )
    }

    // Log view action
    await prisma.opportunityAction.create({
      data: {
        opportunityId: id,
        userId: user.id,
        actionType: 'VIEWED',
      },
    })

    return NextResponse.json({ opportunity })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching opportunity:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = await request.json()

    // Verify ownership
    const existing = await prisma.opportunity.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: 404 }
      )
    }

    const { status, metadata } = body

    // Validate status if provided
    if (status && !Object.values(OpportunityStatus).includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${Object.values(OpportunityStatus).join(', ')}` },
        { status: 400 }
      )
    }

    // Update the opportunity
    const opportunity = await prisma.opportunity.update({
      where: { id },
      data: {
        ...(status && { status: status as OpportunityStatus }),
        ...(metadata && { metadata }),
        lastUpdatedAt: new Date(),
      },
      include: {
        subreddits: true,
        _count: {
          select: { evidence: true },
        },
      },
    })

    // Log status change action
    if (status) {
      const actionType = status === 'TRACKING' ? 'TRACKED' :
                         status === 'ACTED_ON' ? 'CONTENT_CREATED' :
                         status === 'ARCHIVED' ? 'ARCHIVED' : null

      if (actionType) {
        await prisma.opportunityAction.create({
          data: {
            opportunityId: id,
            userId: user.id,
            actionType: actionType as OpportunityActionType,
            metadata: { previousStatus: existing.status },
          },
        })
      }
    }

    return NextResponse.json({ opportunity })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error updating opportunity:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params

    // Verify ownership
    const existing = await prisma.opportunity.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: 404 }
      )
    }

    // Delete the opportunity (cascades to evidence, subreddits, actions)
    await prisma.opportunity.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error deleting opportunity:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

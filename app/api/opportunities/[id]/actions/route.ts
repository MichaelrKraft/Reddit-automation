import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { OpportunityActionType } from '@prisma/client'

// GET: List actions for an opportunity
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params
    const { searchParams } = new URL(request.url)

    const limit = parseInt(searchParams.get('limit') || '50')
    const actionType = searchParams.get('actionType') as OpportunityActionType | null

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

    if (actionType) {
      where.actionType = actionType
    }

    // Fetch actions
    const actions = await prisma.opportunityAction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({
      opportunityId: id,
      actions,
      count: actions.length,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching actions:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// POST: Record a new action
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = await request.json()

    const { actionType, metadata = {} } = body

    // Validate action type
    if (!actionType || !Object.values(OpportunityActionType).includes(actionType)) {
      return NextResponse.json(
        { error: `Invalid actionType. Must be one of: ${Object.values(OpportunityActionType).join(', ')}` },
        { status: 400 }
      )
    }

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

    // Create the action
    const action = await prisma.opportunityAction.create({
      data: {
        opportunityId: id,
        userId: user.id,
        actionType: actionType as OpportunityActionType,
        metadata: JSON.parse(JSON.stringify(metadata)),
      },
    })

    // If marking as CONTENT_CREATED or TRACKED, update the opportunity status
    if (actionType === 'CONTENT_CREATED') {
      await prisma.opportunity.update({
        where: { id },
        data: {
          status: 'ACTED_ON',
          lastUpdatedAt: new Date(),
        },
      })
    } else if (actionType === 'TRACKED') {
      await prisma.opportunity.update({
        where: { id },
        data: {
          status: 'TRACKING',
          lastUpdatedAt: new Date(),
        },
      })
    } else if (actionType === 'ARCHIVED') {
      await prisma.opportunity.update({
        where: { id },
        data: {
          status: 'ARCHIVED',
          lastUpdatedAt: new Date(),
        },
      })
    }

    return NextResponse.json({ action }, { status: 201 })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error recording action:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

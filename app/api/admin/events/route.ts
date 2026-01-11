import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'

// POST: Record a user event (called from client-side analytics)
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { eventType, eventName, page, target, metadata, sessionId } = body

    // Validate required fields
    if (!eventType || !eventName || !page) {
      return NextResponse.json(
        { error: 'Missing required fields: eventType, eventName, page' },
        { status: 400 }
      )
    }

    // Create the event
    const event = await prisma.userEvent.create({
      data: {
        userId,
        eventType,
        eventName,
        page,
        target: target || null,
        metadata: metadata || null,
        sessionId: sessionId || null
      }
    })

    return NextResponse.json({ success: true, eventId: event.id })
  } catch (error) {
    console.error('[Admin Events] Error recording event:', error)
    return NextResponse.json(
      { error: 'Failed to record event' },
      { status: 500 }
    )
  }
}

// GET: Retrieve events (admin only)
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const eventType = searchParams.get('eventType')
    const eventName = searchParams.get('eventName')
    const page = searchParams.get('page')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build filter
    const where: Record<string, unknown> = {}
    if (userId) where.userId = userId
    if (eventType) where.eventType = eventType
    if (eventName) where.eventName = { contains: eventName }
    if (page) where.page = { contains: page }

    const [events, total] = await Promise.all([
      prisma.userEvent.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.userEvent.count({ where })
    ])

    return NextResponse.json({
      events,
      total,
      limit,
      offset,
      hasMore: offset + events.length < total
    })
  } catch (error) {
    console.error('[Admin Events] Error fetching events:', error)
    if (error instanceof Error && error.message.includes('Admin')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}

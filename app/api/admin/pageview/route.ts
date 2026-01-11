import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'

// POST: Record a page view (called from client-side analytics)
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { page, referrer, sessionId } = body

    // Validate required fields
    if (!page) {
      return NextResponse.json(
        { error: 'Missing required field: page' },
        { status: 400 }
      )
    }

    // Create the page view
    const pageView = await prisma.pageView.create({
      data: {
        userId,
        page,
        referrer: referrer || null,
        sessionId: sessionId || null
      }
    })

    return NextResponse.json({ success: true, pageViewId: pageView.id })
  } catch (error) {
    console.error('[Admin PageView] Error recording page view:', error)
    return NextResponse.json(
      { error: 'Failed to record page view' },
      { status: 500 }
    )
  }
}

// GET: Retrieve page views (admin only)
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const page = searchParams.get('page')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build filter
    const where: Record<string, unknown> = {}
    if (userId) where.userId = userId
    if (page) where.page = { contains: page }

    const [pageViews, total] = await Promise.all([
      prisma.pageView.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.pageView.count({ where })
    ])

    return NextResponse.json({
      pageViews,
      total,
      limit,
      offset,
      hasMore: offset + pageViews.length < total
    })
  } catch (error) {
    console.error('[Admin PageView] Error fetching page views:', error)
    if (error instanceof Error && error.message.includes('Admin')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch page views' },
      { status: 500 }
    )
  }
}

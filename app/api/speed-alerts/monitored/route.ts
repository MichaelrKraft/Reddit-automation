import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'

// GET /api/speed-alerts/monitored - List user's monitored subreddits
export async function GET() {
  try {
    const user = await requireUser()

    const monitored = await prisma.monitoredSubreddit.findMany({
      where: { userId: user.id },
      include: {
        alerts: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ monitored })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/speed-alerts/monitored - Add subreddit to monitor
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await request.json()
    const { subreddit } = body

    if (!subreddit) {
      return NextResponse.json(
        { error: 'Subreddit name is required' },
        { status: 400 }
      )
    }

    // Normalize subreddit name (remove r/ prefix if present)
    const normalizedName = subreddit.replace(/^r\//, '').toLowerCase()

    // Check if already monitoring this subreddit
    const existing = await prisma.monitoredSubreddit.findFirst({
      where: {
        userId: user.id,
        subreddit: normalizedName,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Already monitoring this subreddit' },
        { status: 400 }
      )
    }

    // Verify subreddit exists on Reddit
    try {
      const response = await fetch(
        `https://www.reddit.com/r/${normalizedName}/about.json`,
        {
          headers: {
            'User-Agent': 'RedRider/1.0 (Speed Alerts Feature)',
          },
        }
      )

      if (!response.ok) {
        return NextResponse.json(
          { error: `Subreddit r/${normalizedName} not found` },
          { status: 404 }
        )
      }
    } catch {
      return NextResponse.json(
        { error: 'Failed to verify subreddit' },
        { status: 500 }
      )
    }

    const monitored = await prisma.monitoredSubreddit.create({
      data: {
        subreddit: normalizedName,
        userId: user.id,
        isActive: true,
        checkInterval: 15,
      },
    })

    return NextResponse.json({ monitored }, { status: 201 })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/speed-alerts/monitored - Remove monitored subreddit
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Monitored subreddit ID is required' },
        { status: 400 }
      )
    }

    // Verify ownership
    const monitored = await prisma.monitoredSubreddit.findFirst({
      where: { id, userId: user.id },
    })

    if (!monitored) {
      return NextResponse.json(
        { error: 'Monitored subreddit not found' },
        { status: 404 }
      )
    }

    await prisma.monitoredSubreddit.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/speed-alerts/monitored - Toggle active status
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await request.json()
    const { id, isActive } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Monitored subreddit ID is required' },
        { status: 400 }
      )
    }

    // Verify ownership
    const monitored = await prisma.monitoredSubreddit.findFirst({
      where: { id, userId: user.id },
    })

    if (!monitored) {
      return NextResponse.json(
        { error: 'Monitored subreddit not found' },
        { status: 404 }
      )
    }

    const updated = await prisma.monitoredSubreddit.update({
      where: { id },
      data: { isActive },
    })

    return NextResponse.json({ monitored: updated })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

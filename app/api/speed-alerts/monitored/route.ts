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
            'User-Agent': 'ReddRide/1.0 (by /u/reddride_app)',
          },
        }
      )

      console.log(`[Speed Alerts] Reddit API response for r/${normalizedName}: ${response.status}`)

      if (!response.ok) {
        // Provide more specific error messages based on status
        if (response.status === 404) {
          return NextResponse.json(
            { error: `Subreddit r/${normalizedName} not found. Make sure the name is spelled correctly.` },
            { status: 404 }
          )
        } else if (response.status === 403 || response.status === 429) {
          // Reddit is rate limiting or blocking - but the subreddit likely exists
          // Let the user add it anyway since we can still monitor it
          console.log(`[Speed Alerts] Reddit rate limiting (${response.status}), allowing r/${normalizedName} to be added anyway`)
        } else {
          return NextResponse.json(
            { error: `Reddit API error (${response.status}). Please try again in a moment.` },
            { status: 500 }
          )
        }
      }
    } catch (err) {
      console.error(`[Speed Alerts] Failed to verify subreddit r/${normalizedName}:`, err)
      // On network error, still allow adding - the monitoring will fail if subreddit doesn't exist
      console.log(`[Speed Alerts] Network error, allowing r/${normalizedName} to be added anyway`)
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

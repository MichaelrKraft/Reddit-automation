import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'

/**
 * GET - List subreddits configured for opportunity mining
 */
export async function GET() {
  try {
    const user = await requireUser()

    const subreddits = await prisma.monitoredSubreddit.findMany({
      where: {
        userId: user.id,
        opportunityMiningEnabled: true,
      },
      select: {
        id: true,
        subreddit: true,
        isActive: true,
        opportunityFrequency: true,
        lastOpportunityScan: true,
        createdAt: true,
      },
      orderBy: { subreddit: 'asc' },
    })

    return NextResponse.json({ subreddits })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching opportunity subreddits:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST - Add a subreddit for opportunity mining
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await request.json()
    const { subreddit, frequency = 'daily' } = body

    if (!subreddit) {
      return NextResponse.json(
        { error: 'Subreddit name is required' },
        { status: 400 }
      )
    }

    // Clean subreddit name (remove r/ prefix if present)
    const cleanSubreddit = subreddit.replace(/^r\//, '').toLowerCase().trim()

    if (!cleanSubreddit || cleanSubreddit.length < 2) {
      return NextResponse.json(
        { error: 'Invalid subreddit name' },
        { status: 400 }
      )
    }

    // Check if already exists
    const existing = await prisma.monitoredSubreddit.findFirst({
      where: {
        userId: user.id,
        subreddit: cleanSubreddit,
      },
    })

    if (existing) {
      // Update existing to enable opportunity mining
      const updated = await prisma.monitoredSubreddit.update({
        where: { id: existing.id },
        data: {
          opportunityMiningEnabled: true,
          opportunityFrequency: frequency,
          isActive: true,
        },
      })

      return NextResponse.json({
        subreddit: updated,
        message: `Enabled opportunity mining for r/${cleanSubreddit}`,
      })
    }

    // Create new monitored subreddit with opportunity mining enabled
    const newSubreddit = await prisma.monitoredSubreddit.create({
      data: {
        userId: user.id,
        subreddit: cleanSubreddit,
        isActive: true,
        opportunityMiningEnabled: true,
        opportunityFrequency: frequency,
      },
    })

    return NextResponse.json({
      subreddit: newSubreddit,
      message: `Added r/${cleanSubreddit} for opportunity mining`,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error adding opportunity subreddit:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE - Remove a subreddit from opportunity mining
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(request.url)
    const subredditId = searchParams.get('id')

    if (!subredditId) {
      return NextResponse.json(
        { error: 'Subreddit ID is required' },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.monitoredSubreddit.findFirst({
      where: {
        id: subredditId,
        userId: user.id,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Subreddit not found' },
        { status: 404 }
      )
    }

    // Disable opportunity mining (don't delete the record in case it's used for speed alerts)
    await prisma.monitoredSubreddit.update({
      where: { id: subredditId },
      data: {
        opportunityMiningEnabled: false,
      },
    })

    return NextResponse.json({
      message: `Disabled opportunity mining for r/${existing.subreddit}`,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error removing opportunity subreddit:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'

// GET - Fetch keyword matches
export async function GET(request: NextRequest) {
  try {
    const user = await getOrCreateUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const keywordId = searchParams.get('keywordId')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    const matches = await prisma.keywordMatch.findMany({
      where: {
        userId: user.id,
        ...(keywordId ? { keywordId } : {}),
        ...(unreadOnly ? { isRead: false } : {}),
      },
      include: {
        keyword: true,
      },
      orderBy: { matchedAt: 'desc' },
      take: 100,
    })

    return NextResponse.json({ matches })
  } catch (error: any) {
    console.error('[KeywordMatches] GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Update match status
export async function POST(request: NextRequest) {
  try {
    const user = await getOrCreateUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, matchId, matchIds } = body

    // Action: markRead - Mark single or multiple matches as read
    if (action === 'markRead') {
      const ids = matchIds || (matchId ? [matchId] : [])

      if (ids.length === 0) {
        return NextResponse.json({ error: 'No match IDs provided' }, { status: 400 })
      }

      await prisma.keywordMatch.updateMany({
        where: {
          id: { in: ids },
          userId: user.id,
        },
        data: { isRead: true },
      })

      return NextResponse.json({ success: true })
    }

    // Action: markActed - Mark match as acted on
    if (action === 'markActed' && matchId) {
      await prisma.keywordMatch.updateMany({
        where: {
          id: matchId,
          userId: user.id,
        },
        data: { isActedOn: true, isRead: true },
      })

      return NextResponse.json({ success: true })
    }

    // Action: markAllRead - Mark all matches as read
    if (action === 'markAllRead') {
      await prisma.keywordMatch.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('[KeywordMatches] POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

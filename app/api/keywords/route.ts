import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import { triggerKeywordCheck } from '@/lib/keyword-monitor'

// GET - Fetch user's keywords
export async function GET(request: NextRequest) {
  try {
    const user = await getOrCreateUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const keywords = await prisma.userKeyword.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { matches: true },
        },
      },
    })

    // Get unread match count
    const unreadCount = await prisma.keywordMatch.count({
      where: {
        userId: user.id,
        isRead: false,
      },
    })

    return NextResponse.json({
      keywords,
      unreadCount,
    })
  } catch (error: any) {
    console.error('[Keywords] GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Add new keyword or perform actions
export async function POST(request: NextRequest) {
  try {
    const user = await getOrCreateUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, keyword, keywordId, subreddits } = body

    // Action: add - Add a new keyword
    if (action === 'add' && keyword) {
      const normalized = keyword.toLowerCase().trim()

      // Normalize subreddits: remove r/ prefix, lowercase, comma-separated
      let normalizedSubreddits: string | null = null
      if (subreddits && typeof subreddits === 'string' && subreddits.trim()) {
        normalizedSubreddits = subreddits
          .split(',')
          .map(s => s.trim().replace(/^r\//, '').toLowerCase())
          .filter(Boolean)
          .join(',')
        if (!normalizedSubreddits) normalizedSubreddits = null
      }

      // Check if already exists
      const existing = await prisma.userKeyword.findFirst({
        where: {
          userId: user.id,
          keyword: normalized,
        },
      })

      if (existing) {
        return NextResponse.json({ error: 'Keyword already exists' }, { status: 400 })
      }

      const newKeyword = await prisma.userKeyword.create({
        data: {
          userId: user.id,
          keyword: normalized,
          subreddits: normalizedSubreddits,
        },
      })

      // Trigger an immediate check for this keyword
      await triggerKeywordCheck(newKeyword.id)

      return NextResponse.json({ keyword: newKeyword })
    }

    // Action: toggle - Toggle keyword active/inactive
    if (action === 'toggle' && keywordId) {
      const keyword = await prisma.userKeyword.findFirst({
        where: { id: keywordId, userId: user.id },
      })

      if (!keyword) {
        return NextResponse.json({ error: 'Keyword not found' }, { status: 404 })
      }

      const updated = await prisma.userKeyword.update({
        where: { id: keywordId },
        data: { isActive: !keyword.isActive },
      })

      return NextResponse.json({ keyword: updated })
    }

    // Action: delete - Remove a keyword
    if (action === 'delete' && keywordId) {
      await prisma.userKeyword.deleteMany({
        where: { id: keywordId, userId: user.id },
      })

      return NextResponse.json({ success: true })
    }

    // Action: scan - Trigger a scan for all keywords
    if (action === 'scan') {
      const result = await triggerKeywordCheck()
      return NextResponse.json({
        message: 'Scan completed',
        ...result,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('[Keywords] POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

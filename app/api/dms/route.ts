import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateUser } from '@/lib/auth'
import { getRedditClient } from '@/lib/reddit'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

// GET - Fetch unread DMs
export async function GET(request: NextRequest) {
  try {
    const user = await getOrCreateUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const reddit: any = getRedditClient()

    // Fetch unread messages from inbox
    const unreadMessages = await reddit.getUnreadMessages({ limit: 25 })

    // Get dismissed DM IDs from database
    const dismissedDMs = await prisma.dismissedDM.findMany({
      where: { clerkId },
      select: { redditMsgId: true },
    })
    const dismissedIds = new Set(dismissedDMs.map(d => d.redditMsgId))

    // Filter to only private messages (not comment replies) and exclude dismissed ones
    const dms = unreadMessages
      .filter((msg: any) => msg.was_comment === false && !dismissedIds.has(msg.id))
      .map((msg: any) => ({
        id: msg.id,
        author: msg.author?.name || 'unknown',
        subject: msg.subject,
        body: msg.body?.slice(0, 500), // Truncate long messages
        created: new Date(msg.created_utc * 1000).toISOString(),
        isNew: msg.new,
        redditUrl: `https://www.reddit.com/message/messages/${msg.id}`,
      }))

    return NextResponse.json({
      dms,
      count: dms.length,
    })
  } catch (error: any) {
    console.error('[DMs] Fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Mark DM as read/dismissed
export async function POST(request: NextRequest) {
  try {
    const user = await getOrCreateUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { messageId, action } = body

    if (action === 'markRead' && messageId) {
      // Save to database so it stays dismissed
      await prisma.dismissedDM.upsert({
        where: {
          clerkId_redditMsgId: { clerkId, redditMsgId: messageId },
        },
        update: { dismissedAt: new Date() },
        create: { clerkId, redditMsgId: messageId },
      })

      // Also try to mark as read on Reddit (optional, may fail)
      try {
        const reddit: any = getRedditClient()
        const message = await reddit.getMessage(messageId)
        await message.markAsRead()
      } catch (redditError) {
        // Ignore Reddit API errors - we've saved locally
        console.log('[DMs] Reddit markAsRead failed (non-critical):', redditError)
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('[DMs] Action error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

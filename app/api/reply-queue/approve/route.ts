import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import { getRedditClient } from '@/lib/reddit'

// POST - Batch approve and post replies
export async function POST(request: NextRequest) {
  try {
    const user = await getOrCreateUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { replyIds } = body

    if (!replyIds || !Array.isArray(replyIds) || replyIds.length === 0) {
      return NextResponse.json({ error: 'No reply IDs provided' }, { status: 400 })
    }

    // Fetch all selected replies
    const replies = await prisma.queuedReply.findMany({
      where: {
        id: { in: replyIds },
        userId: user.id,
        status: 'PENDING',
      },
      include: {
        comment: {
          include: {
            post: true,
          },
        },
      },
    })

    if (replies.length === 0) {
      return NextResponse.json({ error: 'No valid pending replies found' }, { status: 404 })
    }

    const reddit: any = getRedditClient()
    const results: Array<{ id: string; success: boolean; error?: string }> = []

    for (const reply of replies) {
      try {
        // Mark as approved
        await prisma.queuedReply.update({
          where: { id: reply.id },
          data: { status: 'APPROVED', approvedAt: new Date() },
        })

        // Post the reply to Reddit
        const redditComment = await reddit.getComment(reply.comment.redditId)
        await redditComment.reply(reply.aiReplyText)

        // Mark as posted
        await prisma.queuedReply.update({
          where: { id: reply.id },
          data: { status: 'POSTED', postedAt: new Date() },
        })

        // Update the original comment as replied
        await prisma.comment.update({
          where: { id: reply.comment.id },
          data: {
            replied: true,
            replyText: reply.aiReplyText,
          },
        })

        results.push({ id: reply.id, success: true })
        console.log(`[ReplyQueue] Posted reply ${reply.id} successfully`)
      } catch (error: any) {
        console.error(`[ReplyQueue] Failed to post reply ${reply.id}:`, error)

        // Mark as failed
        await prisma.queuedReply.update({
          where: { id: reply.id },
          data: { status: 'FAILED' },
        })

        results.push({ id: reply.id, success: false, error: error.message })
      }
    }

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    return NextResponse.json({
      message: `Processed ${results.length} replies: ${successful} posted, ${failed} failed`,
      results,
      successful,
      failed,
    })
  } catch (error: any) {
    console.error('[ReplyQueue] Approve error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

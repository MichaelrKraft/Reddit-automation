import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import { triggerCommentScan } from '@/lib/comment-scanner'

// GET - Fetch pending replies for the user
export async function GET(request: NextRequest) {
  try {
    const user = await getOrCreateUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'PENDING'

    const queuedReplies = await prisma.queuedReply.findMany({
      where: {
        userId: user.id,
        status: status as any,
      },
      include: {
        comment: {
          include: {
            post: {
              include: {
                subreddit: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Get counts by status
    const counts = await prisma.queuedReply.groupBy({
      by: ['status'],
      where: { userId: user.id },
      _count: true,
    })

    const statusCounts = counts.reduce((acc, item) => {
      acc[item.status] = item._count
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      replies: queuedReplies,
      counts: statusCounts,
    })
  } catch (error: any) {
    console.error('[ReplyQueue] GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Update reply status or trigger scan
export async function POST(request: NextRequest) {
  try {
    const user = await getOrCreateUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, replyId, newText, postId } = body

    // Action: scan - Trigger a comment scan
    if (action === 'scan') {
      const result = await triggerCommentScan(user.id, postId)
      return NextResponse.json({
        message: 'Scan completed',
        ...result,
      })
    }

    // Action: edit - Update the AI reply text
    if (action === 'edit' && replyId) {
      const reply = await prisma.queuedReply.findFirst({
        where: { id: replyId, userId: user.id },
      })

      if (!reply) {
        return NextResponse.json({ error: 'Reply not found' }, { status: 404 })
      }

      const updated = await prisma.queuedReply.update({
        where: { id: replyId },
        data: { aiReplyText: newText },
      })

      return NextResponse.json({ reply: updated })
    }

    // Action: dismiss - Mark reply as dismissed
    if (action === 'dismiss' && replyId) {
      const reply = await prisma.queuedReply.findFirst({
        where: { id: replyId, userId: user.id },
      })

      if (!reply) {
        return NextResponse.json({ error: 'Reply not found' }, { status: 404 })
      }

      const updated = await prisma.queuedReply.update({
        where: { id: replyId },
        data: { status: 'DISMISSED' },
      })

      return NextResponse.json({ reply: updated })
    }

    // Action: regenerate - Generate a new AI reply
    if (action === 'regenerate' && replyId) {
      const reply = await prisma.queuedReply.findFirst({
        where: { id: replyId, userId: user.id },
        include: {
          comment: {
            include: {
              post: {
                include: { subreddit: true },
              },
            },
          },
        },
      })

      if (!reply) {
        return NextResponse.json({ error: 'Reply not found' }, { status: 404 })
      }

      const { generateReply } = await import('@/lib/ai')
      const newReplyText = await generateReply({
        commentContent: reply.comment.content,
        postTitle: reply.comment.post.title,
        postContent: reply.comment.post.content || '',
        subreddit: reply.comment.post.subreddit.name,
        commentAuthor: reply.comment.author,
      })

      const updated = await prisma.queuedReply.update({
        where: { id: replyId },
        data: { aiReplyText: newReplyText },
      })

      return NextResponse.json({ reply: updated })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('[ReplyQueue] POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

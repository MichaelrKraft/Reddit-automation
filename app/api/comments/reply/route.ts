import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRedditClient } from '@/lib/reddit'
import { generateReply } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { commentId, customReply, useAI = true } = body
    
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        post: {
          include: {
            subreddit: true,
          },
        },
      },
    })
    
    if (!comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }
    
    let replyText = customReply
    
    if (useAI && !customReply) {
      replyText = await generateReply({
        commentContent: comment.content,
        postTitle: comment.post.title,
        postContent: comment.post.content,
        subreddit: comment.post.subreddit.name,
        commentAuthor: comment.author,
      })
    }
    
    if (!replyText) {
      return NextResponse.json(
        { error: 'No reply text provided' },
        { status: 400 }
      )
    }
    
    const reddit: any = getRedditClient()
    const redditComment = await reddit.getComment(comment.redditId)
    const reply = await redditComment.reply(replyText)
    
    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        replied: true,
        replyText,
      },
    })
    
    return NextResponse.json({
      message: 'Reply posted successfully',
      comment: updatedComment,
      redditReplyId: reply.id,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

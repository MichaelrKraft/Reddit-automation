import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRedditClient } from '@/lib/reddit'
import { getOrCreateUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getOrCreateUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')
    const includeQueue = searchParams.get('includeQueue') === 'true'

    // Get user's accounts to filter comments
    const userAccounts = await prisma.redditAccount.findMany({
      where: { userId: user.id },
      select: { id: true },
    })
    const accountIds = userAccounts.map(a => a.id)

    const comments = await prisma.comment.findMany({
      where: {
        ...(postId ? { postId } : {}),
        post: {
          accountId: { in: accountIds },
        },
      },
      include: {
        post: {
          include: {
            subreddit: true,
          },
        },
        ...(includeQueue ? {
          queuedReplies: {
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' as const },
          },
        } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ comments })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { postId } = body
    
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { subreddit: true },
    })
    
    if (!post || !post.redditId) {
      return NextResponse.json(
        { error: 'Post not found or not yet posted to Reddit' },
        { status: 404 }
      )
    }
    
    const reddit: any = getRedditClient()
    const submission = await reddit.getSubmission(post.redditId)
    const comments = await submission.comments.fetchAll()
    
    const savedComments = []
    
    for (const comment of comments) {
      if (comment.author.name === '[deleted]') continue
      
      const existing = await prisma.comment.findFirst({
        where: { redditId: comment.id },
      })

      if (!existing) {
        const saved = await prisma.comment.create({
          data: {
            redditId: comment.id,
            postId: post.id,
            author: comment.author.name,
            content: comment.body,
          },
        })
        savedComments.push(saved)
      }
    }
    
    return NextResponse.json({ 
      message: 'Comments fetched successfully',
      newComments: savedComments.length,
      comments: savedComments,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

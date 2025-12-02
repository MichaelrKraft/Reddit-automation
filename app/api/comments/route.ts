import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRedditClient } from '@/lib/reddit'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')
    
    const comments = await prisma.comment.findMany({
      where: postId ? { postId } : {},
      include: {
        post: {
          include: {
            subreddit: true,
          },
        },
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
    
    const reddit = getRedditClient()
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
            score: comment.score,
            createdAt: new Date(comment.created_utc * 1000),
            parentId: comment.parent_id.startsWith('t1_') 
              ? comment.parent_id.substring(3) 
              : null,
            depth: comment.depth,
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

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { schedulePost } from '@/lib/queue'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { postId, scheduledAt } = body
    
    if (!postId || !scheduledAt) {
      return NextResponse.json(
        { error: 'Missing postId or scheduledAt' },
        { status: 400 }
      )
    }
    
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { subreddit: true },
    })
    
    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }
    
    const scheduledDate = new Date(scheduledAt)
    
    await prisma.post.update({
      where: { id: postId },
      data: { scheduledAt: scheduledDate },
    })
    
    await schedulePost(
      {
        postId: post.id,
        subreddit: post.subreddit.name,
        title: post.title,
        text: post.postType === 'text' ? post.content : undefined,
        url: (post.postType === 'link' || post.postType === 'image') ? post.content : undefined,
        firstComment: post.firstComment || undefined,
      },
      scheduledDate
    )
    
    return NextResponse.json({ 
      success: true,
      message: 'Post scheduled successfully',
      scheduledAt: scheduledDate,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

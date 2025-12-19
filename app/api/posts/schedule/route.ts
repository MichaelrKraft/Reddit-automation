import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { schedulePost, checkRedisConnection } from '@/lib/queue'

export async function POST(request: NextRequest) {
  console.log('[Schedule API] Received scheduling request')

  try {
    const body = await request.json()
    const { postId, scheduledAt } = body

    console.log(`[Schedule API] Post ID: ${postId}, Scheduled At: ${scheduledAt}`)

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
      console.log(`[Schedule API] Post not found: ${postId}`)
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    const scheduledDate = new Date(scheduledAt)

    // Update database first
    console.log(`[Schedule API] Updating post scheduledAt in database`)
    await prisma.post.update({
      where: { id: postId },
      data: { scheduledAt: scheduledDate },
    })
    console.log(`[Schedule API] Database updated successfully`)

    // Check Redis connection before scheduling
    const redisCheck = await checkRedisConnection()
    if (!redisCheck.connected) {
      console.error(`[Schedule API] Redis not connected: ${redisCheck.error}`)
      return NextResponse.json({
        success: false,
        error: `Redis connection failed: ${redisCheck.error}`,
        scheduledAt: scheduledDate,
        note: 'Post saved to database but not added to queue. Worker may not pick it up.',
      }, { status: 500 })
    }

    // Add to queue
    console.log(`[Schedule API] Adding to BullMQ queue`)
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

    console.log(`[Schedule API] Post scheduled successfully`)
    return NextResponse.json({
      success: true,
      message: 'Post scheduled successfully',
      scheduledAt: scheduledDate,
    })
  } catch (error: any) {
    console.error(`[Schedule API] Error:`, error.message)
    return NextResponse.json(
      { error: error.message, details: 'Check server logs for more info' },
      { status: 500 }
    )
  }
}

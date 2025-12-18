import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { getPostQueue, schedulePost } from '@/lib/queue'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = await request.json()
    const { scheduledAt } = body

    if (!scheduledAt) {
      return NextResponse.json(
        { error: 'Missing scheduledAt field' },
        { status: 400 }
      )
    }

    // Verify the post belongs to this user
    const existingPost = await prisma.post.findFirst({
      where: {
        id,
        account: { userId: user.id },
      },
      include: {
        subreddit: true,
      },
    })

    if (!existingPost) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    // Remove existing job from queue (if it exists)
    try {
      const queue = getPostQueue()
      const existingJob = await queue.getJob(id)
      if (existingJob) {
        await existingJob.remove()
      }
    } catch (err) {
      // Job might not exist, that's ok
      console.log('No existing job to remove for post:', id)
    }

    const scheduledDate = new Date(scheduledAt)

    // Update the database
    const post = await prisma.post.update({
      where: { id },
      data: {
        scheduledAt: scheduledDate,
        status: 'scheduled',
      },
      include: {
        subreddit: true,
      },
    })

    // Schedule new job in the queue
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

    return NextResponse.json({ post })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { submitPost } from '@/lib/reddit'
import { getPostQueue } from '@/lib/queue'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params

    // Get the post with all needed data
    const post = await prisma.post.findFirst({
      where: {
        id,
        account: { userId: user.id },
      },
      include: {
        subreddit: true,
        account: true,
      },
    })

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    if (post.status === 'posted') {
      return NextResponse.json(
        { error: 'Post has already been submitted to Reddit' },
        { status: 400 }
      )
    }

    // Remove any existing queued job
    try {
      const queue = getPostQueue()
      const existingJob = await queue.getJob(id)
      if (existingJob) {
        await existingJob.remove()
        console.log(`Removed queued job for post: ${id}`)
      }
    } catch (err) {
      console.log('No existing job to remove for post:', id)
    }

    // Submit directly to Reddit
    console.log(`Posting directly to Reddit: ${post.title} to r/${post.subreddit.name}`)

    const submission = await submitPost({
      subreddit: post.subreddit.name,
      title: post.title,
      text: post.postType === 'text' ? post.content : undefined,
      url: (post.postType === 'link' || post.postType === 'image') ? post.content : undefined,
    })

    // Fetch the submission to resolve lazy-loaded properties
    // Snoowrap returns proxy objects - .fetch() resolves them to actual values
    const fetchedSubmission = await submission.fetch()

    // Update the post in database
    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        status: 'posted',
        postedAt: new Date(),
        redditId: fetchedSubmission.id,
        url: `https://reddit.com${fetchedSubmission.permalink}`,
      },
      include: {
        subreddit: true,
      },
    })

    // Create analytics record
    await prisma.postAnalytics.create({
      data: {
        postId: id,
        upvotes: 0,
        downvotes: 0,
        score: 0,
        commentCount: 0,
        engagement: 0,
      },
    })

    // Post first comment if provided
    if (post.firstComment) {
      try {
        console.log(`Adding first comment to post: ${id}`)
        await submission.reply(post.firstComment)
        console.log(`First comment added successfully`)
      } catch (commentError: any) {
        console.error(`Failed to add first comment:`, commentError)
        // Don't fail the whole request if comment fails
      }
    }

    return NextResponse.json({
      success: true,
      post: updatedPost,
      redditUrl: `https://reddit.com${fetchedSubmission.permalink}`,
    })
  } catch (error: any) {
    console.error('Post now failed:', error)

    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update post status to failed
    try {
      const { id } = await params
      await prisma.post.update({
        where: { id },
        data: { status: 'failed' },
      })
    } catch (updateErr) {
      console.error('Failed to update post status:', updateErr)
    }

    return NextResponse.json(
      { error: error.message || 'Failed to post to Reddit' },
      { status: 500 }
    )
  }
}

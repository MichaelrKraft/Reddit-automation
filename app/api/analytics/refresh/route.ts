import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRedditClient } from '@/lib/reddit'

export async function POST(request: NextRequest) {
  try {
    // Handle empty body gracefully
    let postId: string | undefined
    try {
      const body = await request.json()
      postId = body.postId
    } catch {
      // No body sent - that's fine, we'll refresh all posts
    }
    
    let posts
    
    if (postId) {
      const post = await prisma.post.findUnique({
        where: { id: postId },
      })
      posts = post ? [post] : []
    } else {
      posts = await prisma.post.findMany({
        where: {
          status: 'posted',
          redditId: { not: null },
        },
      })
    }

    console.log(`[Analytics Refresh] Found ${posts.length} posts to update`)
    console.log(`[Analytics Refresh] Posts:`, posts.map(p => ({ id: p.id, status: p.status, redditId: p.redditId })))

    const reddit: any = getRedditClient()
    let updatedCount = 0

    for (const post of posts) {
      if (!post.redditId) continue

      try {
        const submission = await reddit.getSubmission(post.redditId)
        await submission.fetch()

        const existingAnalytics = await prisma.postAnalytics.findUnique({
          where: { postId: post.id },
        })
        
        const upvotes = submission.ups || 0
        const downvotes = submission.downs || 0
        const score = submission.score || 0
        const commentCount = submission.num_comments || 0
        const engagement = upvotes + downvotes + commentCount
        
        if (existingAnalytics) {
          await prisma.postAnalytics.update({
            where: { postId: post.id },
            data: {
              upvotes,
              downvotes,
              score,
              commentCount,
              engagement,
              lastUpdated: new Date(),
            },
          })
        } else {
          await prisma.postAnalytics.create({
            data: {
              postId: post.id,
              upvotes,
              downvotes,
              score,
              commentCount,
              engagement,
            },
          })
        }
        
        updatedCount++
      } catch (error) {
        console.error(`Failed to refresh analytics for post ${post.id}:`, error)
      }
    }
    
    return NextResponse.json({
      message: 'Analytics refreshed successfully',
      postsFound: posts.length,
      updatedCount,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

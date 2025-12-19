import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRedditClient } from '@/lib/reddit'
import { getOrCreateUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getOrCreateUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's Reddit accounts
    const userAccounts = await prisma.redditAccount.findMany({
      where: { userId: user.id },
      select: { id: true }
    })
    const accountIds = userAccounts.map(a => a.id)

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
      // Verify the post belongs to user's account
      const post = await prisma.post.findFirst({
        where: {
          id: postId,
          accountId: { in: accountIds }
        },
      })
      posts = post ? [post] : []
    } else {
      posts = await prisma.post.findMany({
        where: {
          status: 'posted',
          redditId: { not: null },
          accountId: { in: accountIds },  // Filter by user's accounts
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
        // fetch() resolves lazy-loaded properties and returns the resolved submission
        const fetchedSubmission = await submission.fetch()

        const existingAnalytics = await prisma.postAnalytics.findUnique({
          where: { postId: post.id },
        })

        // Use fetchedSubmission to get resolved values (not lazy proxies)
        const upvotes = fetchedSubmission.ups || 0
        const downvotes = fetchedSubmission.downs || 0
        const score = fetchedSubmission.score || 0
        const commentCount = fetchedSubmission.num_comments || 0
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

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
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

    // Fetch scheduled posts for user's accounts, sorted by soonest first
    const scheduledPosts = await prisma.post.findMany({
      where: {
        status: 'scheduled',
        accountId: { in: accountIds },
      },
      include: {
        subreddit: {
          select: { name: true, displayName: true }
        }
      },
      orderBy: { scheduledAt: 'asc' },
      take: 5, // Limit to 5 for dashboard display
    })

    return NextResponse.json({
      scheduledPosts: scheduledPosts.map(post => ({
        id: post.id,
        title: post.title,
        subreddit: post.subreddit.name,
        displayName: post.subreddit.displayName,
        scheduledAt: post.scheduledAt,
        postType: post.postType,
      }))
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

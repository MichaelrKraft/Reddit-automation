import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { fetchUserProfile, fetchAllUserPosts, calculateAnalytics } from '@/lib/spy-mode/tracker'

// GET - List all tracked accounts for user
export async function GET() {
  try {
    const user = await requireUser()
    const userId = user.id

    const accounts = await prisma.spyAccount.findMany({
      where: { userId },
      include: {
        posts: {
          orderBy: { postedAt: 'desc' },
          take: 25,
        },
        alerts: {
          where: { isRead: false },
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    // Calculate analytics for each account
    const accountsWithAnalytics = accounts.map(account => {
      const posts = account.posts.map(p => ({
        redditId: p.redditId,
        title: p.title,
        content: p.content,
        url: p.url,
        subreddit: p.subreddit,
        postType: p.postType as 'text' | 'link' | 'image' | 'video',
        score: p.score,
        upvoteRatio: p.upvoteRatio,
        commentCount: p.commentCount,
        awards: p.awards,
        postedAt: p.postedAt,
      }))

      const analytics = calculateAnalytics(posts)

      return {
        ...account,
        analytics,
        unreadAlerts: account.alerts.length,
      }
    })

    return NextResponse.json({ accounts: accountsWithAnalytics })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching spy accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    )
  }
}

// POST - Add new account to track
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const userId = user.id
    const { username } = await request.json()

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

    // Clean up username (remove u/ prefix if present)
    const cleanUsername = username.replace(/^u\//, '').trim()

    // Check if already tracking
    const existing = await prisma.spyAccount.findUnique({
      where: {
        userId_username: {
          userId,
          username: cleanUsername,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Already tracking this account' },
        { status: 400 }
      )
    }

    // Fetch profile from Reddit
    const profile = await fetchUserProfile(cleanUsername)

    if (!profile) {
      return NextResponse.json(
        { error: 'Reddit user not found or profile is private' },
        { status: 404 }
      )
    }

    // Create spy account
    const spyAccount = await prisma.spyAccount.create({
      data: {
        userId,
        username: profile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        totalKarma: profile.totalKarma,
        accountAge: profile.accountCreated,
      },
    })

    // Fetch initial posts in background (don't wait)
    fetchAndStorePosts(spyAccount.id, cleanUsername)

    return NextResponse.json({
      account: spyAccount,
      message: 'Account added. Posts will be fetched shortly.',
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error adding spy account:', error)

    // Return descriptive error message
    let errorMessage = 'Failed to add account'

    if (error.message?.includes('Missing Reddit API credentials')) {
      errorMessage = 'Reddit API is not configured. Please check your Reddit credentials.'
    } else if (error.message?.includes('rate limit') || error.statusCode === 429) {
      errorMessage = 'Reddit rate limit reached. Please try again in a few minutes.'
    } else if (error.code === 'P2002') {
      errorMessage = 'This account is already being tracked'
    } else if (error.message) {
      // Include the actual error message for debugging
      errorMessage = `Failed to add account: ${error.message}`
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

// Background function to fetch and store posts
async function fetchAndStorePosts(accountId: string, username: string) {
  try {
    console.log(`[Spy Mode] Fetching posts for ${username} (accountId: ${accountId})`)
    const posts = await fetchAllUserPosts(username, 100)

    console.log(`[Spy Mode] Fetched ${posts.length} posts for ${username}`)

    if (posts.length === 0) {
      console.log(`[Spy Mode] No posts found for ${username}`)
      return
    }

    // Store posts
    const result = await prisma.spyPost.createMany({
      data: posts.map(p => ({
        accountId,
        redditId: p.redditId,
        title: p.title,
        content: p.content,
        url: p.url,
        subreddit: p.subreddit,
        postType: p.postType,
        score: p.score,
        upvoteRatio: p.upvoteRatio,
        commentCount: p.commentCount,
        awards: p.awards,
        postedAt: p.postedAt,
      })),
      skipDuplicates: true,
    })

    console.log(`[Spy Mode] Stored ${result.count} posts for ${username}`)

    // Update lastPostId
    await prisma.spyAccount.update({
      where: { id: accountId },
      data: {
        lastPostId: posts[0].redditId,
        lastChecked: new Date(),
      },
    })

    console.log(`[Spy Mode] Updated lastPostId for ${username}`)
  } catch (error) {
    console.error(`Error fetching posts for ${username}:`, error)
  }
}

// PATCH - Manually refresh posts for an account (returns debug info)
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser()
    const userId = user.id
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('id')

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 })
    }

    // Verify ownership
    const account = await prisma.spyAccount.findFirst({
      where: { id: accountId, userId },
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    console.log(`[Spy Mode] Manual refresh for ${account.username}`)

    // Fetch posts synchronously (not in background) so we can return results
    const posts = await fetchAllUserPosts(account.username, 100)

    console.log(`[Spy Mode] Manual refresh fetched ${posts.length} posts for ${account.username}`)

    if (posts.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No posts found for u/${account.username}. This user may have no posts or their posts may be hidden.`,
        postsFound: 0,
        postsStored: 0,
      })
    }

    // Store posts
    const result = await prisma.spyPost.createMany({
      data: posts.map(p => ({
        accountId,
        redditId: p.redditId,
        title: p.title,
        content: p.content,
        url: p.url,
        subreddit: p.subreddit,
        postType: p.postType,
        score: p.score,
        upvoteRatio: p.upvoteRatio,
        commentCount: p.commentCount,
        awards: p.awards,
        postedAt: p.postedAt,
      })),
      skipDuplicates: true,
    })

    // Update lastPostId
    await prisma.spyAccount.update({
      where: { id: accountId },
      data: {
        lastPostId: posts[0].redditId,
        lastChecked: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: `Refreshed posts for u/${account.username}`,
      postsFound: posts.length,
      postsStored: result.count,
      samplePost: posts[0] ? {
        title: posts[0].title.substring(0, 50),
        subreddit: posts[0].subreddit,
        score: posts[0].score,
      } : null,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error refreshing spy account:', error)
    return NextResponse.json(
      { error: `Failed to refresh: ${error.message || 'Unknown error'}` },
      { status: 500 }
    )
  }
}

// DELETE - Remove tracked account
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser()
    const userId = user.id
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('id')

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      )
    }

    // Verify ownership
    const account = await prisma.spyAccount.findFirst({
      where: { id: accountId, userId },
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Delete (cascade will remove posts, alerts, insights)
    await prisma.spyAccount.delete({
      where: { id: accountId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error deleting spy account:', error)
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}

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
    return NextResponse.json(
      { error: 'Failed to add account' },
      { status: 500 }
    )
  }
}

// Background function to fetch and store posts
async function fetchAndStorePosts(accountId: string, username: string) {
  try {
    const posts = await fetchAllUserPosts(username, 100)

    if (posts.length === 0) return

    // Store posts
    await prisma.spyPost.createMany({
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
  } catch (error) {
    console.error(`Error fetching posts for ${username}:`, error)
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

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { getRedditClient } from '@/lib/reddit'

// POST - Add a user from the leaderboard to Spy Mode tracking
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subreddit: string }> }
) {
  try {
    const user = await requireUser()
    const userId = user.id
    const { subreddit } = await params
    const cleanSubreddit = subreddit.toLowerCase().replace(/^r\//, '')
    const { username } = await request.json()

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

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
      // Update the leaderboard entry to show as tracked
      await updateLeaderboardTrackedStatus(cleanSubreddit, cleanUsername, true)

      return NextResponse.json({
        success: true,
        spyAccountId: existing.id,
        message: 'Already tracking this user',
        alreadyTracked: true,
      })
    }

    // Fetch user profile from Reddit directly
    let redditUser: any
    try {
      const reddit = getRedditClient()
      redditUser = await reddit.getUser(cleanUsername).fetch()
    } catch (redditError: any) {
      console.error('[Track API] Reddit fetch error:', redditError.message)
      return NextResponse.json(
        { error: 'Reddit user not found or profile is private' },
        { status: 404 }
      )
    }

    const profile = {
      username: redditUser.name,
      displayName: redditUser.subreddit?.title || null,
      avatarUrl: redditUser.icon_img?.split('?')[0] || redditUser.snoovatar_img || null,
      totalKarma: (redditUser.link_karma || 0) + (redditUser.comment_karma || 0),
      accountCreated: redditUser.created_utc ? new Date(redditUser.created_utc * 1000) : null,
    }

    // Create SpyAccount
    const spyAccount = await prisma.spyAccount.create({
      data: {
        userId,
        username: cleanUsername,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        totalKarma: profile.totalKarma,
        accountAge: profile.accountCreated,
        isActive: true,
      },
    })

    // Fetch and store user's posts in background (non-blocking)
    ;(async () => {
      try {
        const reddit = getRedditClient()
        const submissions = await reddit.getUser(cleanUsername).getSubmissions({ limit: 25, sort: 'new' })

        if (submissions.length > 0) {
          await prisma.spyPost.createMany({
            data: submissions.map((post: any) => ({
              accountId: spyAccount.id,
              redditId: post.name,
              title: post.title,
              content: post.selftext || null,
              url: `https://reddit.com${post.permalink}`,
              subreddit: post.subreddit?.display_name || '',
              postType: post.is_video ? 'video' : post.is_self ? 'text' : 'link',
              score: post.score || 0,
              upvoteRatio: post.upvote_ratio || 0,
              commentCount: post.num_comments || 0,
              awards: post.total_awards_received || 0,
              postedAt: new Date(post.created_utc * 1000),
            })),
            skipDuplicates: true,
          })

          // Update lastPostId with the newest post
          await prisma.spyAccount.update({
            where: { id: spyAccount.id },
            data: { lastPostId: submissions[0].name },
          })
        }
      } catch (err) {
        console.error('[Track API] Failed to fetch posts for new spy account:', err)
      }
    })()

    // Update the leaderboard entry to show as tracked
    await updateLeaderboardTrackedStatus(cleanSubreddit, cleanUsername, true)

    return NextResponse.json({
      success: true,
      spyAccountId: spyAccount.id,
      message: `Now tracking u/${cleanUsername}`,
      alreadyTracked: false,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[Track API] Error tracking user:', error.message || error)
    console.error('[Track API] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)))
    return NextResponse.json(
      { error: `Failed to track user: ${error.message || 'Unknown error'}` },
      { status: 500 }
    )
  }
}

async function updateLeaderboardTrackedStatus(
  subreddit: string,
  username: string,
  isTracked: boolean
) {
  try {
    const leaderboard = await prisma.subredditLeaderboard.findUnique({
      where: { subreddit },
    })

    if (leaderboard) {
      await prisma.leaderboardEntry.updateMany({
        where: {
          leaderboardId: leaderboard.id,
          username,
        },
        data: { isTracked },
      })
    }
  } catch (error) {
    console.error('Failed to update leaderboard tracked status:', error)
  }
}

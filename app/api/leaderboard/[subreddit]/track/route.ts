import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchUserProfile, fetchAllUserPosts } from '@/lib/spy-mode/tracker'

// POST - Add a user from the leaderboard to Spy Mode tracking
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subreddit: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id') || 'demo-user'
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

    // Fetch user profile from Reddit
    const profile = await fetchUserProfile(cleanUsername)

    if (!profile) {
      return NextResponse.json(
        { error: 'Reddit user not found or profile is private' },
        { status: 404 }
      )
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

    // Fetch and store user's posts in background
    fetchAllUserPosts(cleanUsername)
      .then(async (posts) => {
        if (posts.length > 0) {
          await prisma.spyPost.createMany({
            data: posts.map(post => ({
              accountId: spyAccount.id,
              redditId: post.redditId,
              title: post.title,
              content: post.content,
              url: post.url,
              subreddit: post.subreddit,
              postType: post.postType,
              score: post.score,
              upvoteRatio: post.upvoteRatio,
              commentCount: post.commentCount,
              awards: post.awards,
              postedAt: post.postedAt,
            })),
            skipDuplicates: true,
          })

          // Update lastPostId
          const latestPost = posts.sort((a, b) =>
            new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
          )[0]

          if (latestPost) {
            await prisma.spyAccount.update({
              where: { id: spyAccount.id },
              data: { lastPostId: latestPost.redditId },
            })
          }
        }
      })
      .catch(err => console.error('Failed to fetch posts for new spy account:', err))

    // Update the leaderboard entry to show as tracked
    await updateLeaderboardTrackedStatus(cleanSubreddit, cleanUsername, true)

    return NextResponse.json({
      success: true,
      spyAccountId: spyAccount.id,
      message: `Now tracking u/${cleanUsername}`,
      alreadyTracked: false,
    })
  } catch (error) {
    console.error('Error tracking user:', error)
    return NextResponse.json(
      { error: 'Failed to track user' },
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

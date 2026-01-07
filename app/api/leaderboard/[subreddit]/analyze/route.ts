import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { analyzeSubredditContributors, RankedUser } from '@/lib/leaderboard-analyzer'
import { TimeFilter } from '@/lib/reddit'

// POST - Trigger new analysis for a subreddit
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subreddit: string }> }
) {
  try {
    const { subreddit } = await params
    const cleanSubreddit = subreddit.toLowerCase().replace(/^r\//, '')
    const body = await request.json().catch(() => ({}))

    const timeFilter: TimeFilter = body.timeFilter || 'month'
    const limit = Math.min(body.limit || 100, 100) // Max 100 posts

    // Check for rate limiting (1 analysis per hour per subreddit)
    const existingLeaderboard = await prisma.subredditLeaderboard.findUnique({
      where: { subreddit: cleanSubreddit },
    })

    const COOLDOWN = 60 * 60 * 1000 // 1 hour
    if (existingLeaderboard) {
      const timeSinceLastAnalysis = Date.now() - existingLeaderboard.lastAnalyzed.getTime()
      if (timeSinceLastAnalysis < COOLDOWN) {
        const cooldownRemaining = Math.ceil((COOLDOWN - timeSinceLastAnalysis) / 60000)
        return NextResponse.json(
          {
            error: `Please wait ${cooldownRemaining} minutes before analyzing again`,
            cooldownRemaining,
          },
          { status: 429 }
        )
      }
    }

    // Analyze the subreddit
    console.log(`[Leaderboard] Analyzing r/${cleanSubreddit} with timeFilter=${timeFilter}, limit=${limit}`)

    let rankedUsers: RankedUser[]
    try {
      rankedUsers = await analyzeSubredditContributors({
        subreddit: cleanSubreddit,
        timeFilter,
        limit,
      })
    } catch (error: any) {
      console.error(`[Leaderboard] Analysis failed for r/${cleanSubreddit}:`, error.message)
      return NextResponse.json(
        { error: `Failed to analyze subreddit: ${error.message}` },
        { status: 400 }
      )
    }

    if (rankedUsers.length === 0) {
      return NextResponse.json(
        { error: 'No contributors found in this subreddit' },
        { status: 404 }
      )
    }

    // Upsert leaderboard
    const leaderboard = await prisma.subredditLeaderboard.upsert({
      where: { subreddit: cleanSubreddit },
      create: {
        subreddit: cleanSubreddit,
        timeFilter,
        totalUsers: rankedUsers.length,
        lastAnalyzed: new Date(),
      },
      update: {
        timeFilter,
        totalUsers: rankedUsers.length,
        lastAnalyzed: new Date(),
      },
    })

    // Delete old entries and insert new ones
    await prisma.leaderboardEntry.deleteMany({
      where: { leaderboardId: leaderboard.id },
    })

    await prisma.leaderboardEntry.createMany({
      data: rankedUsers.map(user => ({
        leaderboardId: leaderboard.id,
        username: user.username,
        rank: user.rank,
        influenceScore: user.influenceScore,
        totalScore: user.totalScore,
        postCount: user.postCount,
        avgScore: user.avgScore,
        avgComments: user.avgComments,
        successRate: user.successRate,
        topPosts: user.posts.slice(0, 5), // Store top 5 posts
        isTracked: false,
      })),
    })

    // Fetch complete leaderboard with entries
    const completeLeaderboard = await prisma.subredditLeaderboard.findUnique({
      where: { id: leaderboard.id },
      include: {
        entries: {
          orderBy: { rank: 'asc' },
        },
      },
    })

    console.log(`[Leaderboard] Successfully analyzed r/${cleanSubreddit}: ${rankedUsers.length} contributors found`)

    return NextResponse.json({
      success: true,
      entriesFound: rankedUsers.length,
      leaderboard: completeLeaderboard,
    })
  } catch (error) {
    console.error('Error analyzing leaderboard:', error)
    return NextResponse.json(
      { error: 'Failed to analyze subreddit' },
      { status: 500 }
    )
  }
}

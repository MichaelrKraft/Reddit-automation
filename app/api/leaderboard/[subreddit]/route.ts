import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch existing leaderboard for a subreddit
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subreddit: string }> }
) {
  try {
    const { subreddit } = await params
    const cleanSubreddit = subreddit.toLowerCase().replace(/^r\//, '')

    const leaderboard = await prisma.subredditLeaderboard.findUnique({
      where: { subreddit: cleanSubreddit },
      include: {
        entries: {
          orderBy: { rank: 'asc' },
          take: 50,
        },
      },
    })

    if (!leaderboard) {
      return NextResponse.json({
        leaderboard: null,
        isStale: false,
        message: 'No leaderboard found. Click Analyze to discover top contributors.',
      })
    }

    // Check if leaderboard is stale (>24 hours old)
    const STALE_THRESHOLD = 24 * 60 * 60 * 1000
    const isStale = Date.now() - leaderboard.lastAnalyzed.getTime() > STALE_THRESHOLD

    return NextResponse.json({
      leaderboard: {
        id: leaderboard.id,
        subreddit: leaderboard.subreddit,
        timeFilter: leaderboard.timeFilter,
        lastAnalyzed: leaderboard.lastAnalyzed,
        totalUsers: leaderboard.totalUsers,
        entries: leaderboard.entries.map(entry => ({
          id: entry.id,
          username: entry.username,
          displayName: entry.displayName,
          avatarUrl: entry.avatarUrl,
          totalKarma: entry.totalKarma,
          rank: entry.rank,
          influenceScore: entry.influenceScore,
          totalScore: entry.totalScore,
          postCount: entry.postCount,
          avgScore: entry.avgScore,
          avgComments: entry.avgComments,
          successRate: entry.successRate,
          topPosts: entry.topPosts,
          isTracked: entry.isTracked,
        })),
      },
      isStale,
    })
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}

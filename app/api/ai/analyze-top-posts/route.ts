import { NextRequest, NextResponse } from 'next/server'
import { fetchTopPosts, TimeFilter } from '@/lib/reddit'
import { analyzeTopPostsPatterns, generatePostFromPatterns, TopPostAnalysis } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      subreddit,
      timeFilter = 'all',
      limit = 25,
      userGoal,
      generatePost = false,
      postType = 'text'
    } = body

    if (!subreddit) {
      return NextResponse.json(
        { error: 'Subreddit name is required' },
        { status: 400 }
      )
    }

    // Step 1: Fetch top posts from Reddit
    console.log(`[TopPostsAnalyzer] Fetching top ${limit} posts from r/${subreddit} (${timeFilter})`)
    const topPosts = await fetchTopPosts(subreddit, limit, timeFilter as TimeFilter)

    if (topPosts.length === 0) {
      return NextResponse.json(
        { error: 'No posts found in this subreddit' },
        { status: 404 }
      )
    }

    // Step 2: Analyze patterns with AI
    console.log(`[TopPostsAnalyzer] Analyzing ${topPosts.length} posts for patterns...`)
    const analysis = await analyzeTopPostsPatterns(topPosts, subreddit)

    // Step 3: Optionally generate posts based on patterns
    let generatedPosts = null
    if (generatePost && userGoal) {
      console.log(`[TopPostsAnalyzer] Generating posts for goal: ${userGoal}`)
      generatedPosts = await generatePostFromPatterns(analysis, userGoal, subreddit, postType)
    }

    return NextResponse.json({
      success: true,
      subreddit,
      timeFilter,
      postsAnalyzed: topPosts.length,
      topPosts: topPosts.slice(0, 5).map(p => ({
        title: p.title,
        score: p.score,
        numComments: p.numComments,
        permalink: p.permalink
      })),
      analysis,
      generatedPosts
    })
  } catch (error: any) {
    console.error('[TopPostsAnalyzer] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to analyze top posts' },
      { status: 500 }
    )
  }
}

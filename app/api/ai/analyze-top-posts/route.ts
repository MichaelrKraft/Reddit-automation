import { NextRequest, NextResponse } from 'next/server'
import { fetchTopPosts, TimeFilter } from '@/lib/reddit'
import { analyzeTopPostsPatterns, generatePostFromPatterns, TopPostAnalysis } from '@/lib/ai'
import { calculateViralScore } from '@/lib/viral-score'

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
      const rawPosts = await generatePostFromPatterns(analysis, userGoal, subreddit, postType)

      // Calculate actual viral scores using the data-driven scoring system
      const scoredPosts = rawPosts.map(post => {
        const viralAnalysis = calculateViralScore(post.title, subreddit, postType)
        return {
          ...post,
          viralScore: viralAnalysis.score,
          viralTier: viralAnalysis.tier,
          suggestions: viralAnalysis.suggestions // Include improvement tips
        }
      })

      // Sort by viral score (highest first) and return top 3
      generatedPosts = scoredPosts
        .sort((a, b) => b.viralScore - a.viralScore)
        .slice(0, 3)

      console.log(`[TopPostsAnalyzer] Generated ${rawPosts.length} posts, returning top 3 with scores: ${generatedPosts.map(p => p.viralScore).join(', ')}`)
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

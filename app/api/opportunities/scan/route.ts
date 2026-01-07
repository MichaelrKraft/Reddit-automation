import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRedditClient, TimeFilter } from '@/lib/reddit'
import {
  analyzePostsForOpportunities,
  filterOpportunities,
  mapCategoryToEnum,
  RedditPostInput,
} from '@/lib/opportunity-analyzer'

// POST - Scan a subreddit for product opportunities
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'demo-user'
    const body = await request.json()
    const { subreddit, limit = 50, timeFilter = 'week' } = body

    if (!subreddit) {
      return NextResponse.json(
        { error: 'Subreddit name is required' },
        { status: 400 }
      )
    }

    const cleanSubreddit = subreddit.toLowerCase().replace(/^r\//, '').trim()

    // Fetch posts from Reddit
    const reddit = getRedditClient()
    const sub = reddit.getSubreddit(cleanSubreddit)

    let posts: any[]
    try {
      // Use "hot" for more recent relevant posts
      posts = await sub.getHot({ limit: Math.min(limit, 100) })
    } catch (error: any) {
      if (error.message?.includes('404') || error.message?.includes('banned')) {
        return NextResponse.json(
          { error: `Subreddit r/${cleanSubreddit} not found or is private` },
          { status: 404 }
        )
      }
      throw error
    }

    // Transform to our format
    const postInputs: RedditPostInput[] = posts.map((post: any) => ({
      id: post.id,
      title: post.title || '',
      content: post.selftext || '',
      subreddit: cleanSubreddit,
      score: post.score || 0,
      commentCount: post.num_comments || 0,
      url: `https://reddit.com${post.permalink}`,
      author: post.author?.name || '[deleted]',
      postedAt: new Date(post.created_utc * 1000),
    }))

    // Analyze posts with AI
    const analyses = await analyzePostsForOpportunities(postInputs)

    // Filter to only real opportunities (confidence >= 50)
    const opportunities = filterOpportunities(analyses, 50)

    // Store opportunities in database
    const savedOpportunities = []

    for (const opp of opportunities) {
      // Check if we already have this opportunity (by Reddit post URL)
      const existing = await prisma.opportunityEvidence.findFirst({
        where: { redditPostUrl: opp.rawPost.url },
        include: { opportunity: true },
      })

      if (existing) {
        // Update evidence count
        await prisma.opportunity.update({
          where: { id: existing.opportunityId },
          data: {
            evidenceCount: { increment: 1 },
            lastUpdatedAt: new Date(),
          },
        })
        savedOpportunities.push(existing.opportunity)
        continue
      }

      // Create new opportunity
      const opportunity = await prisma.opportunity.create({
        data: {
          title: opp.rawPost.title,
          category: mapCategoryToEnum(opp.category) as any,
          score: opp.confidence,
          problemStatement: opp.opportunityText,
          evidenceCount: 1,
          userId,
          status: 'NEW',
          metadata: {
            displayCategory: opp.category,
            confidence: opp.confidence,
          },
          evidence: {
            create: {
              redditPostId: postInputs.find(p => p.url === opp.rawPost.url)?.id || '',
              redditPostUrl: opp.rawPost.url,
              quoteText: opp.rawPost.title,
              author: opp.rawPost.author,
              subreddit: cleanSubreddit,
              upvotes: opp.rawPost.score,
              commentCount: opp.rawPost.commentCount,
              postedAt: opp.rawPost.postedAt,
            },
          },
          subreddits: {
            create: {
              subreddit: cleanSubreddit,
              mentionCount: 1,
            },
          },
        },
        include: {
          evidence: true,
          subreddits: true,
        },
      })

      savedOpportunities.push(opportunity)
    }

    return NextResponse.json({
      success: true,
      subreddit: cleanSubreddit,
      postsScanned: posts.length,
      opportunitiesFound: opportunities.length,
      opportunitiesSaved: savedOpportunities.length,
      opportunities: savedOpportunities.map(formatOpportunityResponse),
    })
  } catch (error) {
    console.error('Error scanning subreddit for opportunities:', error)
    return NextResponse.json(
      { error: 'Failed to scan subreddit' },
      { status: 500 }
    )
  }
}

function formatOpportunityResponse(opp: any) {
  const metadata = opp.metadata as any || {}
  return {
    id: opp.id,
    title: opp.title,
    category: metadata.displayCategory || opp.category,
    confidence: metadata.confidence || opp.score,
    opportunityText: opp.problemStatement,
    status: opp.status,
    evidenceCount: opp.evidenceCount,
    createdAt: opp.firstSeenAt,
    subreddits: opp.subreddits?.map((s: any) => s.subreddit) || [],
    evidence: opp.evidence?.map((e: any) => ({
      postUrl: e.redditPostUrl,
      title: e.quoteText,
      author: e.author,
      subreddit: e.subreddit,
      score: e.upvotes,
      comments: e.commentCount,
      postedAt: e.postedAt,
    })) || [],
  }
}

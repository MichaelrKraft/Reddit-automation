import { prisma } from './prisma'
import { getRedditClient } from './reddit'
import { analyzePost, findDuplicateOpportunity, RedditPost } from './opportunity-analyzer'
import { calculateScore, recalculateOpportunityScore, determineTrendDirection } from './opportunity-scorer'

/**
 * Scan a subreddit for opportunities
 */
export async function scanSubreddit(
  userId: string,
  subredditName: string,
  limit: number = 15
): Promise<{
  postsScanned: number
  opportunitiesFound: number
  opportunitiesUpdated: number
}> {
  const reddit = await getRedditClient()

  console.log(`[OpportunityScanner] Scanning r/${subredditName} for ${userId}`)

  let postsScanned = 0
  let opportunitiesFound = 0
  let opportunitiesUpdated = 0

  try {
    // Fetch hot and new posts from subreddit
    const subreddit = reddit.getSubreddit(subredditName)
    const [hotPosts, newPosts] = await Promise.all([
      subreddit.getHot({ limit: Math.ceil(limit / 2) }),
      subreddit.getNew({ limit: Math.ceil(limit / 2) }),
    ])

    // Combine and deduplicate
    const allPosts = [...hotPosts, ...newPosts]
    const uniquePosts = new Map<string, any>()
    for (const post of allPosts) {
      if (!uniquePosts.has(post.id)) {
        uniquePosts.set(post.id, post)
      }
    }

    // Get user's existing opportunities for deduplication
    const existingOpportunities = await prisma.opportunity.findMany({
      where: { userId },
      select: { id: true, title: true, problemStatement: true },
    })

    // Analyze each post
    for (const [postId, post] of uniquePosts) {
      postsScanned++

      const redditPost: RedditPost = {
        id: post.id,
        title: post.title,
        selftext: post.selftext || '',
        subreddit: subredditName,
        author: post.author?.name || '[deleted]',
        score: post.score,
        num_comments: post.num_comments,
        created_utc: post.created_utc,
        url: `https://reddit.com${post.permalink}`,
      }

      // Run AI analysis
      const analysis = await analyzePost(redditPost)

      if (!analysis || !analysis.isOpportunity) {
        continue
      }

      // Check for existing similar opportunity
      const existingOpportunityId = await findDuplicateOpportunity(
        analysis.title,
        analysis.problemStatement,
        existingOpportunities
      )

      if (existingOpportunityId) {
        // Add evidence to existing opportunity
        await addEvidenceToOpportunity(
          existingOpportunityId,
          redditPost,
          analysis.sentiment
        )
        opportunitiesUpdated++
      } else {
        // Create new opportunity
        const newOpportunity = await createOpportunity(
          userId,
          analysis,
          redditPost
        )
        existingOpportunities.push({
          id: newOpportunity.id,
          title: analysis.title,
          problemStatement: analysis.problemStatement,
        })
        opportunitiesFound++
      }

      // Small delay between analyses to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    // Update last scan timestamp
    await prisma.monitoredSubreddit.updateMany({
      where: {
        userId,
        subreddit: subredditName,
      },
      data: {
        lastOpportunityScan: new Date(),
      },
    })

    console.log(
      `[OpportunityScanner] Completed r/${subredditName}: ` +
      `${postsScanned} scanned, ${opportunitiesFound} new, ${opportunitiesUpdated} updated`
    )

    return { postsScanned, opportunitiesFound, opportunitiesUpdated }
  } catch (error: any) {
    console.error(`[OpportunityScanner] Error scanning r/${subredditName}:`, error)
    throw error
  }
}

/**
 * Create a new opportunity from analysis
 */
async function createOpportunity(
  userId: string,
  analysis: {
    category: any
    title: string
    problemStatement: string
    sentiment: number
    confidence: number
    themes: string[]
    keywords: string[]
  },
  post: RedditPost
) {
  // Calculate initial score
  const scoreInput = {
    mentionCount: 1,
    timeWindowDays: 1,
    avgUpvotes: post.score,
    avgComments: post.num_comments,
    maxUpvotes: post.score,
    avgSentiment: analysis.sentiment,
    recentMentions: 1,
    olderMentions: 0,
    subredditCount: 1,
    hasCompetitorMentions: false,
    aiConfidence: analysis.confidence,
  }

  const scoreBreakdown = calculateScore(scoreInput)

  const opportunity = await prisma.opportunity.create({
    data: {
      title: analysis.title,
      category: analysis.category,
      score: scoreBreakdown.total,
      problemStatement: analysis.problemStatement,
      evidenceCount: 1,
      trendDirection: 'GROWING', // New opportunities start as growing
      status: 'NEW',
      metadata: JSON.parse(JSON.stringify({
        scoreBreakdown,
        themes: analysis.themes,
        keywords: analysis.keywords,
        aiConfidence: analysis.confidence,
      })),
      userId,
      evidence: {
        create: {
          redditPostId: post.id,
          redditPostUrl: post.url,
          quoteText: `${post.title}\n\n${post.selftext}`.slice(0, 2000),
          author: post.author,
          subreddit: post.subreddit,
          upvotes: post.score,
          commentCount: post.num_comments,
          sentimentScore: analysis.sentiment,
          postedAt: new Date(post.created_utc * 1000),
        },
      },
      subreddits: {
        create: {
          subreddit: post.subreddit,
          mentionCount: 1,
        },
      },
    },
    include: {
      evidence: true,
      subreddits: true,
    },
  })

  return opportunity
}

/**
 * Add evidence to an existing opportunity and recalculate score
 */
async function addEvidenceToOpportunity(
  opportunityId: string,
  post: RedditPost,
  sentimentScore: number
) {
  // Check if this post is already evidence
  const existingEvidence = await prisma.opportunityEvidence.findFirst({
    where: {
      opportunityId,
      redditPostId: post.id,
    },
  })

  if (existingEvidence) {
    return // Already have this evidence
  }

  // Add new evidence
  await prisma.opportunityEvidence.create({
    data: {
      opportunityId,
      redditPostId: post.id,
      redditPostUrl: post.url,
      quoteText: `${post.title}\n\n${post.selftext}`.slice(0, 2000),
      author: post.author,
      subreddit: post.subreddit,
      upvotes: post.score,
      commentCount: post.num_comments,
      sentimentScore,
      postedAt: new Date(post.created_utc * 1000),
    },
  })

  // Update or create subreddit mention
  await prisma.opportunitySubreddit.upsert({
    where: {
      opportunityId_subreddit: {
        opportunityId,
        subreddit: post.subreddit,
      },
    },
    update: {
      mentionCount: { increment: 1 },
      lastMentionedAt: new Date(),
    },
    create: {
      opportunityId,
      subreddit: post.subreddit,
      mentionCount: 1,
    },
  })

  // Recalculate opportunity score
  await recalculateOpportunityFromEvidence(opportunityId)
}

/**
 * Recalculate an opportunity's score based on all evidence
 */
export async function recalculateOpportunityFromEvidence(opportunityId: string) {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    include: {
      evidence: true,
      subreddits: true,
    },
  })

  if (!opportunity || opportunity.evidence.length === 0) {
    return
  }

  const { score, trendDirection } = recalculateOpportunityScore(
    opportunity.evidence.map((e) => ({
      upvotes: e.upvotes,
      commentCount: e.commentCount,
      sentimentScore: e.sentimentScore,
      postedAt: e.postedAt,
      subreddit: e.subreddit,
    })),
    (opportunity.metadata as any)?.aiConfidence || 0.7,
    false
  )

  await prisma.opportunity.update({
    where: { id: opportunityId },
    data: {
      score: score.total,
      evidenceCount: opportunity.evidence.length,
      trendDirection,
      lastUpdatedAt: new Date(),
      metadata: JSON.parse(JSON.stringify({
        ...(opportunity.metadata as object || {}),
        scoreBreakdown: score,
      })),
    },
  })
}

/**
 * Scan all enabled subreddits for a user
 */
export async function scanAllUserSubreddits(userId: string): Promise<{
  subredditsScanned: number
  totalPostsScanned: number
  totalOpportunitiesFound: number
  totalOpportunitiesUpdated: number
}> {
  const monitoredSubreddits = await prisma.monitoredSubreddit.findMany({
    where: {
      userId,
      opportunityMiningEnabled: true,
      isActive: true,
    },
  })

  let totalPostsScanned = 0
  let totalOpportunitiesFound = 0
  let totalOpportunitiesUpdated = 0

  for (const monitored of monitoredSubreddits) {
    try {
      const result = await scanSubreddit(userId, monitored.subreddit)
      totalPostsScanned += result.postsScanned
      totalOpportunitiesFound += result.opportunitiesFound
      totalOpportunitiesUpdated += result.opportunitiesUpdated
    } catch (error) {
      console.error(`Failed to scan r/${monitored.subreddit}:`, error)
    }

    // Delay between subreddits
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  return {
    subredditsScanned: monitoredSubreddits.length,
    totalPostsScanned,
    totalOpportunitiesFound,
    totalOpportunitiesUpdated,
  }
}

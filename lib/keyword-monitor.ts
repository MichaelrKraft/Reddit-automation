import { Queue, Worker } from 'bullmq'
import { getConnection } from './queue'
import { prisma } from './prisma'
import { generateReply, classifyIntent } from './ai'
import { scoreRelevance, BusinessContext } from './relevance-scorer'
import { getGoogleRankForRedditPost } from './seo-finder'

let _keywordQueue: Queue | null = null

export function getKeywordQueue(): Queue {
  if (!_keywordQueue) {
    _keywordQueue = new Queue('keyword-monitor', {
      connection: getConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    })
  }
  return _keywordQueue
}

// Search Reddit using public JSON API (no auth required, FREE)
// type=link ensures we only get posts, not comments
// If subreddits provided, search within those specific subreddits
async function searchReddit(keyword: string, subreddits?: string | null): Promise<any[]> {
  let allPosts: any[] = []

  // If subreddits specified, search each one individually
  if (subreddits && subreddits.trim()) {
    const subredditList = subreddits.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)

    for (const subreddit of subredditList) {
      // Use restrict_sr=1 to limit search to this subreddit only
      const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(keyword)}&restrict_sr=1&sort=new&t=day&limit=15&type=link`

      try {
        // Add delay between subreddit searches to avoid rate limiting
        if (allPosts.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'ReddRide/1.0 (Keyword Monitor)',
          },
        })

        if (response.ok) {
          const data = await response.json()
          const posts = data.data?.children?.map((child: any) => child.data) || []
          allPosts = [...allPosts, ...posts]
          console.log(`[KeywordMonitor] Found ${posts.length} posts for "${keyword}" in r/${subreddit}`)
        } else {
          console.warn(`[KeywordMonitor] Search failed for r/${subreddit}: ${response.status}`)
        }
      } catch (error) {
        console.error(`[KeywordMonitor] Search error for r/${subreddit}:`, error)
      }
    }

    return allPosts
  }

  // No subreddits specified - search all of Reddit
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(keyword)}&sort=new&t=day&limit=25&type=link`

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ReddRide/1.0 (Keyword Monitor)',
      },
    })

    if (!response.ok) {
      console.error(`[KeywordMonitor] Reddit search failed: ${response.status}`)
      return []
    }

    const data = await response.json()
    return data.data?.children?.map((child: any) => child.data) || []
  } catch (error) {
    console.error('[KeywordMonitor] Search error:', error)
    return []
  }
}

// Generate AI comment suggestions for a match
async function generateSuggestions(postTitle: string, subreddit: string): Promise<string[]> {
  try {
    // Generate 3 different style suggestions
    const styles = ['helpful', 'curious', 'expert']
    const suggestions: string[] = []

    for (const style of styles) {
      const reply = await generateReply({
        commentContent: postTitle, // Use title as the "comment" to respond to
        postTitle: postTitle,
        postContent: '',
        subreddit: subreddit,
        commentAuthor: 'OP',
      })
      suggestions.push(reply)
    }

    return suggestions
  } catch (error) {
    console.error('[KeywordMonitor] Failed to generate suggestions:', error)
    return []
  }
}

// Monitor a single keyword for a user
async function monitorKeyword(keywordId: string) {
  const keyword = await prisma.userKeyword.findUnique({
    where: { id: keywordId },
    include: { user: true },
  })

  if (!keyword || !keyword.isActive) {
    console.log(`[KeywordMonitor] Keyword ${keywordId} not found or inactive`)
    return { newMatches: 0 }
  }

  // Get user's business context for relevance scoring
  const businessAnalysis = await prisma.businessAnalysis.findFirst({
    where: { userId: keyword.userId },
    orderBy: { createdAt: 'desc' },
  })

  let businessContext: BusinessContext | null = null
  if (businessAnalysis) {
    try {
      businessContext = {
        businessName: businessAnalysis.businessName || undefined,
        description: businessAnalysis.description || undefined,
        keywords: businessAnalysis.keywords ? JSON.parse(businessAnalysis.keywords) : undefined,
        painPoints: businessAnalysis.painPoints
          ? JSON.parse(businessAnalysis.painPoints).map((p: any) => p.pain || p)
          : undefined,
        targetAudience: businessAnalysis.targetAudience
          ? JSON.parse(businessAnalysis.targetAudience).map((a: any) => a.segment || a)
          : undefined,
      }
    } catch (parseError) {
      console.error(`[KeywordMonitor] Failed to parse business context:`, parseError)
      // Continue without business context - relevance scoring will be skipped
    }
  }

  const searchScope = keyword.subreddits
    ? `in r/${keyword.subreddits.split(',').join(', r/')}`
    : 'across all of Reddit'
  console.log(`[KeywordMonitor] Searching for "${keyword.keyword}" ${searchScope}`)

  const posts = await searchReddit(keyword.keyword, keyword.subreddits)
  let newMatches = 0

  for (const post of posts) {
    // Check if we already have this match
    const existing = await prisma.keywordMatch.findFirst({
      where: {
        keywordId: keyword.id,
        redditPostId: post.id,
      },
    })

    if (existing) continue

    // Generate AI suggestions (only for first few matches to save API calls)
    let aiSuggestions: string[] = []
    if (newMatches < 3) {
      aiSuggestions = await generateSuggestions(post.title, post.subreddit)
    }

    // Score relevance if business context is available
    let relevanceScore: number | null = null
    let relevanceReason: string | null = null

    if (businessContext) {
      try {
        const relevanceResult = await scoreRelevance(
          {
            title: post.title,
            content: post.selftext,
            subreddit: post.subreddit,
            author: post.author,
          },
          businessContext
        )
        relevanceScore = relevanceResult.score
        relevanceReason = relevanceResult.reason
        console.log(`[KeywordMonitor] Scored "${post.title.slice(0, 50)}..." = ${relevanceScore}%`)
      } catch (scoreError) {
        console.error(`[KeywordMonitor] Failed to score post:`, scoreError)
      }
    }

    // Classify intent to detect buying signals (Phase 1 enhancement)
    let intentType: string | null = null
    let intentScore: number | null = null
    let buyingSignal = false
    let aiAnalysis: string | null = null

    try {
      const intentResult = await classifyIntent(
        post.title,
        post.selftext || '',
        keyword.keyword
      )
      intentType = intentResult.intentType
      intentScore = intentResult.intentScore
      buyingSignal = intentResult.buyingSignal
      aiAnalysis = intentResult.reasoning
      console.log(`[KeywordMonitor] Intent: ${intentType} (${intentScore}%) ${buyingSignal ? '🔥 BUYING SIGNAL' : ''}`)
    } catch (intentError) {
      console.error(`[KeywordMonitor] Failed to classify intent:`, intentError)
    }

    // Check Google ranking for high-priority posts (Phase 2 enhancement)
    // Only check for buying signals to save API calls
    let googleRank: number | null = null
    let googleCtr: number | null = null
    let trafficScore: number | null = null

    if (buyingSignal && process.env.SERPAPI_KEY) {
      try {
        const postUrl = `https://reddit.com${post.permalink}`
        const rankResult = await getGoogleRankForRedditPost(postUrl, keyword.keyword)
        googleRank = rankResult.googleRank
        googleCtr = rankResult.googleCtr
        trafficScore = rankResult.trafficScore
        if (googleRank) {
          console.log(`[KeywordMonitor] 📈 Google Rank: #${googleRank} (Traffic Score: ${trafficScore})`)
        }
      } catch (rankError) {
        console.error(`[KeywordMonitor] Failed to check Google rank:`, rankError)
      }
    }

    // Create the match (use upsert to handle race conditions)
    try {
      await prisma.keywordMatch.create({
        data: {
          userId: keyword.userId,
          keywordId: keyword.id,
          redditPostId: post.id,
          postTitle: post.title,
          postUrl: `https://reddit.com${post.permalink}`,
          postAuthor: post.author,
          subreddit: post.subreddit,
          commentCount: post.num_comments || 0,
          upvotes: post.ups || 0,
          aiSuggestions: aiSuggestions.length > 0 ? JSON.stringify(aiSuggestions) : null,
          relevanceScore,
          relevanceReason,
          // Phase 1: Intent Classification
          intentType,
          intentScore,
          buyingSignal,
          aiAnalysis,
          // Phase 2: Google Ranking
          googleRank,
          googleCtr,
          trafficScore,
        },
      })
    } catch (err: any) {
      // Ignore duplicate key errors (P2002) - race condition with concurrent scans
      if (err.code !== 'P2002') {
        throw err
      }
      continue // Skip this match, it already exists
    }

    newMatches++
    console.log(`[KeywordMonitor] New match: "${post.title}" in r/${post.subreddit}`)
  }

  // Update keyword stats
  await prisma.userKeyword.update({
    where: { id: keywordId },
    data: {
      lastCheckedAt: new Date(),
      matchCount: { increment: newMatches },
    },
  })

  return { newMatches }
}

// Monitor all active keywords for all users
async function monitorAllKeywords() {
  const activeKeywords = await prisma.userKeyword.findMany({
    where: { isActive: true },
  })

  console.log(`[KeywordMonitor] Monitoring ${activeKeywords.length} keywords`)

  let totalNewMatches = 0

  for (const keyword of activeKeywords) {
    // Add delay between searches to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000))

    try {
      const result = await monitorKeyword(keyword.id)
      totalNewMatches += result.newMatches
    } catch (error) {
      // Log error but continue with other keywords
      console.error(`[KeywordMonitor] Failed to scan keyword ${keyword.id} (${keyword.keyword}):`, error)
    }
  }

  return { totalNewMatches, keywordsChecked: activeKeywords.length }
}

// Schedule a keyword check
export async function scheduleKeywordCheck(keywordId?: string) {
  const queue = getKeywordQueue()
  const jobId = keywordId ? `check-${keywordId}` : 'check-all'

  // Remove existing job if rescheduling
  const existingJob = await queue.getJob(jobId)
  if (existingJob) {
    await existingJob.remove()
  }

  return await queue.add(
    'check-keywords',
    { keywordId },
    { jobId }
  )
}

// Start the keyword monitor worker
export function startKeywordMonitorWorker() {
  const worker = new Worker(
    'keyword-monitor',
    async (job) => {
      const { keywordId } = job.data

      if (keywordId) {
        return await monitorKeyword(keywordId)
      } else {
        return await monitorAllKeywords()
      }
    },
    { connection: getConnection() }
  )

  worker.on('completed', (job, result) => {
    console.log(`[KeywordMonitor] Job ${job.id} completed:`, result)
  })

  worker.on('failed', (job, err) => {
    console.error(`[KeywordMonitor] Job ${job?.id} failed:`, err)
  })

  return worker
}

// Helper to manually trigger a check (for API calls)
export async function triggerKeywordCheck(keywordId?: string) {
  if (keywordId) {
    return await monitorKeyword(keywordId)
  } else {
    return await monitorAllKeywords()
  }
}

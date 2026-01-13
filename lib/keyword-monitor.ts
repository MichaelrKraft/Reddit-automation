import { Queue, Worker } from 'bullmq'
import { getConnection } from './queue'
import { prisma } from './prisma'
import { generateReply } from './ai'

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

    // Create the match
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
      },
    })

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

    const result = await monitorKeyword(keyword.id)
    totalNewMatches += result.newMatches
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

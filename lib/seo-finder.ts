import { prisma } from './prisma'

interface GoogleResult {
  position: number
  title: string
  link: string
  snippet?: string
}

interface SEOThreadResult {
  rank: number
  title: string
  url: string
  subreddit: string
  snippet?: string
  commentCount?: number
  upvotes?: number
  postAge?: string
}

// Extract subreddit name from Reddit URL
function extractSubreddit(url: string): string {
  const match = url.match(/reddit\.com\/r\/([^\/]+)/)
  return match ? match[1] : 'unknown'
}

// Check if URL is a Reddit thread (not just subreddit homepage)
function isRedditThread(url: string): boolean {
  // Must contain /comments/ to be a specific thread
  return url.includes('/comments/')
}

// Estimate monthly traffic based on Google position
function estimateMonthlyTraffic(rank: number, keywordVolume: number = 1000): number {
  const ctrByRank: Record<number, number> = {
    1: 0.28,  // 28% CTR for position 1
    2: 0.15,
    3: 0.11,
    4: 0.08,
    5: 0.06,
    6: 0.05,
    7: 0.04,
    8: 0.03,
    9: 0.03,
    10: 0.02
  }
  return Math.round(keywordVolume * (ctrByRank[rank] || 0.01))
}

// Demo data for testing without SerpAPI
function generateDemoResults(keyword: string): GoogleResult[] {
  const demoThreads = [
    {
      position: 1,
      title: `${keyword} - What's everyone using? : r/startups`,
      link: `https://www.reddit.com/r/startups/comments/abc123/${keyword.replace(/\s+/g, '_')}_whats_everyone_using/`,
      snippet: `I've been looking for the best ${keyword} solution. What do you all recommend? We're a small team of 5 and need something that...`
    },
    {
      position: 2,
      title: `Best ${keyword} for small business in 2024? : r/smallbusiness`,
      link: `https://www.reddit.com/r/smallbusiness/comments/def456/best_${keyword.replace(/\s+/g, '_')}_2024/`,
      snippet: `Running a small business and need recommendations for ${keyword}. Budget is around $50/month. What's worked for you?`
    },
    {
      position: 4,
      title: `${keyword} comparison thread : r/Entrepreneur`,
      link: `https://www.reddit.com/r/Entrepreneur/comments/ghi789/${keyword.replace(/\s+/g, '_')}_comparison/`,
      snippet: `Let's compile a list of the best ${keyword} options. I'll start: I've tried 3 different solutions and here's what I found...`
    },
    {
      position: 6,
      title: `Frustrated with ${keyword} options : r/SaaS`,
      link: `https://www.reddit.com/r/SaaS/comments/jkl012/frustrated_with_${keyword.replace(/\s+/g, '_')}/`,
      snippet: `Why is it so hard to find a good ${keyword}? Everything is either too expensive or missing basic features. Anyone else?`
    },
    {
      position: 9,
      title: `${keyword} recommendations for beginners : r/productivity`,
      link: `https://www.reddit.com/r/productivity/comments/mno345/${keyword.replace(/\s+/g, '_')}_beginners/`,
      snippet: `New to ${keyword} and feeling overwhelmed by options. What's the easiest to get started with?`
    }
  ]

  return demoThreads
}

// Search Google for Reddit threads using SerpAPI
async function searchGoogle(keyword: string): Promise<GoogleResult[]> {
  const apiKey = process.env.SERPAPI_KEY

  // Demo mode when no API key configured
  if (!apiKey) {
    console.log('[SEO Finder] No SERPAPI_KEY - using demo mode')
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    return generateDemoResults(keyword)
  }

  const params = new URLSearchParams({
    api_key: apiKey,
    q: `${keyword} site:reddit.com`,
    num: '10',
    engine: 'google'
  })

  const response = await fetch(`https://serpapi.com/search?${params}`)

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`SerpAPI error: ${error}`)
  }

  const data = await response.json()

  if (data.error) {
    throw new Error(`SerpAPI error: ${data.error}`)
  }

  return (data.organic_results || []).map((r: any) => ({
    position: r.position,
    title: r.title,
    link: r.link,
    snippet: r.snippet
  }))
}

// Generate demo Reddit data for testing
function generateDemoRedditData(): {
  commentCount: number
  upvotes: number
  postAge: string
} {
  const ages = ['2 months ago', '4 months ago', '8 months ago', '1 years ago', '6 months ago']
  return {
    commentCount: Math.floor(Math.random() * 200) + 20,
    upvotes: Math.floor(Math.random() * 500) + 50,
    postAge: ages[Math.floor(Math.random() * ages.length)]
  }
}

// Fetch Reddit thread data to enrich results
async function getRedditThreadData(url: string): Promise<{
  commentCount?: number
  upvotes?: number
  postAge?: string
}> {
  // Demo mode - return fake data for demo URLs
  if (url.includes('abc123') || url.includes('def456') || url.includes('ghi789') ||
      url.includes('jkl012') || url.includes('mno345')) {
    return generateDemoRedditData()
  }

  try {
    // Use Reddit's JSON API (no auth required)
    const jsonUrl = url.replace(/\/?$/, '.json')
    const response = await fetch(jsonUrl, {
      headers: { 'User-Agent': 'RedRide/1.0' }
    })

    if (!response.ok) return {}

    const data = await response.json()
    const post = data[0]?.data?.children?.[0]?.data

    if (!post) return {}

    // Calculate post age
    const createdAt = new Date(post.created_utc * 1000)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))

    let postAge: string
    if (diffDays < 1) postAge = 'Today'
    else if (diffDays === 1) postAge = '1 day ago'
    else if (diffDays < 30) postAge = `${diffDays} days ago`
    else if (diffDays < 365) postAge = `${Math.floor(diffDays / 30)} months ago`
    else postAge = `${Math.floor(diffDays / 365)} years ago`

    return {
      commentCount: post.num_comments,
      upvotes: post.score,
      postAge
    }
  } catch (error) {
    console.error('[SEO Finder] Failed to fetch Reddit data:', error)
    return {}
  }
}

// Main function: Find Reddit threads ranking on Google
export async function findSEOThreads(keyword: string, userId: string): Promise<SEOThreadResult[]> {
  // 1. Search Google for Reddit threads
  const googleResults = await searchGoogle(keyword)

  // 2. Filter to only Reddit thread URLs (not subreddit homepages)
  const redditThreads = googleResults.filter(r => isRedditThread(r.link))

  // 3. Enrich with Reddit data (comment count, upvotes, age)
  const enrichedThreads = await Promise.all(
    redditThreads.map(async (thread): Promise<SEOThreadResult> => {
      const redditData = await getRedditThreadData(thread.link)
      return {
        rank: thread.position,
        title: thread.title.replace(' : r/', ' - r/').replace(/ - Reddit$/, ''),
        url: thread.link,
        subreddit: extractSubreddit(thread.link),
        snippet: thread.snippet,
        ...redditData
      }
    })
  )

  // 4. Save search to database
  const search = await prisma.sEOSearch.create({
    data: {
      userId,
      keyword,
      resultsCount: enrichedThreads.length,
      threads: {
        create: enrichedThreads.map(thread => ({
          googleRank: thread.rank,
          redditUrl: thread.url,
          postTitle: thread.title,
          subreddit: thread.subreddit,
          snippet: thread.snippet,
          commentCount: thread.commentCount,
          upvotes: thread.upvotes,
          postAge: thread.postAge
        }))
      }
    },
    include: { threads: true }
  })

  console.log(`[SEO Finder] Found ${enrichedThreads.length} threads for "${keyword}"`)

  return enrichedThreads
}

// Get user's search history
export async function getSEOSearchHistory(userId: string, limit: number = 10) {
  return prisma.sEOSearch.findMany({
    where: { userId },
    orderBy: { searchedAt: 'desc' },
    take: limit,
    include: {
      threads: {
        orderBy: { googleRank: 'asc' }
      }
    }
  })
}

// Check if user has lifetime deal (for gating)
export async function hasLifetimeDeal(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { hasLifetimeDeal: true }
  })
  return user?.hasLifetimeDeal ?? false
}

export { estimateMonthlyTraffic }

// Spy Mode - Reddit API Tracker
// Fetches public Reddit user data without authentication

export interface RedditUserProfile {
  username: string
  displayName: string | null
  avatarUrl: string | null
  totalKarma: number
  accountCreated: Date | null
}

export interface RedditPost {
  redditId: string
  title: string
  content: string | null
  url: string
  subreddit: string
  postType: 'text' | 'link' | 'image' | 'video'
  score: number
  upvoteRatio: number
  commentCount: number
  awards: number
  postedAt: Date
}

// Rate limiting: Reddit allows ~60 requests/minute for unauthenticated
const RATE_LIMIT_DELAY = 1100 // 1.1 seconds between requests

let lastRequestTime = 0

async function rateLimitedFetch(url: string, timeoutMs: number = 5000): Promise<Response> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime

  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest))
  }

  lastRequestTime = Date.now()

  // Add timeout to prevent hanging requests
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Redoit:v1.0 (Competitor Intelligence Tool)',
      },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`)
    }
    throw error
  }
}

export async function fetchUserProfile(username: string): Promise<RedditUserProfile | null> {
  try {
    const response = await rateLimitedFetch(
      `https://www.reddit.com/user/${username}/about.json`
    )

    if (!response.ok) {
      console.error(`Failed to fetch profile for ${username}: ${response.status}`)
      return null
    }

    const data = await response.json()
    const user = data.data

    return {
      username: user.name,
      displayName: user.subreddit?.title || null,
      avatarUrl: user.icon_img?.split('?')[0] || user.snoovatar_img || null,
      totalKarma: (user.link_karma || 0) + (user.comment_karma || 0),
      accountCreated: user.created_utc ? new Date(user.created_utc * 1000) : null,
    }
  } catch (error) {
    console.error(`Error fetching profile for ${username}:`, error)
    return null
  }
}

export async function fetchUserPosts(
  username: string,
  limit: number = 25,
  after?: string
): Promise<{ posts: RedditPost[]; after: string | null }> {
  try {
    let url = `https://www.reddit.com/user/${username}/submitted.json?limit=${limit}&sort=new`
    if (after) {
      url += `&after=${after}`
    }

    const response = await rateLimitedFetch(url)

    if (!response.ok) {
      console.error(`Failed to fetch posts for ${username}: ${response.status}`)
      return { posts: [], after: null }
    }

    const data = await response.json()
    const children = data.data?.children || []

    const posts: RedditPost[] = children.map((child: { data: Record<string, unknown> }) => {
      const post = child.data

      // Determine post type
      let postType: 'text' | 'link' | 'image' | 'video' = 'text'
      if (post.is_video) {
        postType = 'video'
      } else if (post.post_hint === 'image' || post.url?.toString().match(/\.(jpg|jpeg|png|gif)$/i)) {
        postType = 'image'
      } else if (!post.is_self) {
        postType = 'link'
      }

      return {
        redditId: post.name as string,
        title: post.title as string,
        content: post.selftext as string || null,
        url: `https://reddit.com${post.permalink}`,
        subreddit: post.subreddit as string,
        postType,
        score: post.score as number || 0,
        upvoteRatio: post.upvote_ratio as number || 0,
        commentCount: post.num_comments as number || 0,
        awards: post.total_awards_received as number || 0,
        postedAt: new Date((post.created_utc as number) * 1000),
      }
    })

    return {
      posts,
      after: data.data?.after || null,
    }
  } catch (error) {
    console.error(`Error fetching posts for ${username}:`, error)
    return { posts: [], after: null }
  }
}

// Fetch all posts for a user (paginated)
export async function fetchAllUserPosts(
  username: string,
  maxPosts: number = 100
): Promise<RedditPost[]> {
  const allPosts: RedditPost[] = []
  let after: string | null = null

  while (allPosts.length < maxPosts) {
    const limit = Math.min(25, maxPosts - allPosts.length)
    const result = await fetchUserPosts(username, limit, after || undefined)

    if (result.posts.length === 0) break

    allPosts.push(...result.posts)
    after = result.after

    if (!after) break
  }

  return allPosts
}

// Calculate analytics from posts
export interface PostAnalytics {
  avgScore: number
  avgComments: number
  totalPosts: number
  successRate: number // % of posts with 100+ upvotes
  postsPerWeek: number
  topSubreddits: { name: string; count: number; avgScore: number }[]
  postingHeatmap: { day: number; hour: number; count: number; avgScore: number }[]
  recentTrend: number[] // Last 7 days scores
}

export function calculateAnalytics(posts: RedditPost[]): PostAnalytics {
  if (posts.length === 0) {
    return {
      avgScore: 0,
      avgComments: 0,
      totalPosts: 0,
      successRate: 0,
      postsPerWeek: 0,
      topSubreddits: [],
      postingHeatmap: [],
      recentTrend: [],
    }
  }

  const totalScore = posts.reduce((sum, p) => sum + p.score, 0)
  const totalComments = posts.reduce((sum, p) => sum + p.commentCount, 0)
  const successfulPosts = posts.filter(p => p.score >= 100).length

  // Calculate posts per week
  const oldestPost = posts[posts.length - 1]
  const newestPost = posts[0]
  const daySpan = Math.max(1,
    (newestPost.postedAt.getTime() - oldestPost.postedAt.getTime()) / (1000 * 60 * 60 * 24)
  )
  const postsPerWeek = (posts.length / daySpan) * 7

  // Subreddit breakdown
  const subredditMap = new Map<string, { count: number; totalScore: number }>()
  posts.forEach(p => {
    const existing = subredditMap.get(p.subreddit) || { count: 0, totalScore: 0 }
    subredditMap.set(p.subreddit, {
      count: existing.count + 1,
      totalScore: existing.totalScore + p.score,
    })
  })

  const topSubreddits = Array.from(subredditMap.entries())
    .map(([name, data]) => ({
      name,
      count: data.count,
      avgScore: Math.round(data.totalScore / data.count),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Posting heatmap (day of week x hour)
  const heatmapMap = new Map<string, { count: number; totalScore: number }>()
  posts.forEach(p => {
    const day = p.postedAt.getDay()
    const hour = p.postedAt.getHours()
    const key = `${day}-${hour}`
    const existing = heatmapMap.get(key) || { count: 0, totalScore: 0 }
    heatmapMap.set(key, {
      count: existing.count + 1,
      totalScore: existing.totalScore + p.score,
    })
  })

  const postingHeatmap = Array.from(heatmapMap.entries()).map(([key, data]) => {
    const [day, hour] = key.split('-').map(Number)
    return {
      day,
      hour,
      count: data.count,
      avgScore: Math.round(data.totalScore / data.count),
    }
  })

  // Recent 7-day trend (scores by day)
  const now = new Date()
  const recentTrend: number[] = []
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now)
    dayStart.setDate(dayStart.getDate() - i)
    dayStart.setHours(0, 0, 0, 0)

    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)

    const dayPosts = posts.filter(p =>
      p.postedAt >= dayStart && p.postedAt < dayEnd
    )

    const dayScore = dayPosts.reduce((sum, p) => sum + p.score, 0)
    recentTrend.push(dayScore)
  }

  return {
    avgScore: Math.round(totalScore / posts.length),
    avgComments: Math.round(totalComments / posts.length),
    totalPosts: posts.length,
    successRate: Math.round((successfulPosts / posts.length) * 100),
    postsPerWeek: Math.round(postsPerWeek * 10) / 10,
    topSubreddits,
    postingHeatmap,
    recentTrend,
  }
}

// Check for new posts since last check
export async function checkForNewPosts(
  username: string,
  lastPostId: string | null
): Promise<{ newPosts: RedditPost[]; latestPostId: string | null }> {
  const result = await fetchUserPosts(username, 10)

  if (result.posts.length === 0) {
    return { newPosts: [], latestPostId: lastPostId }
  }

  const latestPostId = result.posts[0].redditId

  if (!lastPostId) {
    // First time checking - return just the latest post ID
    return { newPosts: [], latestPostId }
  }

  // Find new posts since last check
  const newPosts: RedditPost[] = []
  for (const post of result.posts) {
    if (post.redditId === lastPostId) break
    newPosts.push(post)
  }

  return { newPosts, latestPostId }
}

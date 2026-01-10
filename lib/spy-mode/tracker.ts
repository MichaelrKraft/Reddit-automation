// Spy Mode - Reddit API Tracker
// Uses authenticated Snoowrap client for reliable API access

import { getRedditClient } from '@/lib/reddit'

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

export async function fetchUserProfile(username: string): Promise<RedditUserProfile | null> {
  try {
    console.log(`[Spy Mode] Fetching profile for ${username}...`)
    const reddit = getRedditClient()
    console.log(`[Spy Mode] Reddit client initialized`)
    const user = await reddit.getUser(username).fetch()
    console.log(`[Spy Mode] Fetched user: ${user.name}`)

    // Safely extract values - Snoowrap uses lazy loading and may return functions
    const displayName = typeof user.subreddit?.title === 'string'
      ? user.subreddit.title
      : (user.subreddit?.title ? String(user.subreddit.title) : null)

    const avatarUrl = typeof user.icon_img === 'string'
      ? user.icon_img.split('?')[0]
      : (typeof user.snoovatar_img === 'string' ? user.snoovatar_img : null)

    return {
      username: String(user.name || ''),
      displayName: displayName && displayName !== '[object Function]' ? displayName : null,
      avatarUrl: avatarUrl && avatarUrl !== '[object Function]' ? avatarUrl : null,
      totalKarma: Number(user.link_karma || 0) + Number(user.comment_karma || 0),
      accountCreated: user.created_utc ? new Date(Number(user.created_utc) * 1000) : null,
    }
  } catch (error: any) {
    console.error(`[Spy Mode] Error fetching profile for ${username}:`, error.message || error)
    console.error(`[Spy Mode] Full error:`, error)
    return null
  }
}

export async function fetchUserPosts(
  username: string,
  limit: number = 25,
  after?: string
): Promise<{ posts: RedditPost[]; after: string | null }> {
  try {
    const reddit = getRedditClient()
    const user = reddit.getUser(username)

    const options: any = { limit, sort: 'new' }
    if (after) {
      options.after = after
    }

    const submissions = await user.getSubmissions(options)

    const posts: RedditPost[] = submissions.map((post: any) => {
      // Determine post type
      let postType: 'text' | 'link' | 'image' | 'video' = 'text'
      if (post.is_video) {
        postType = 'video'
      } else if (post.post_hint === 'image' || String(post.url || '').match(/\.(jpg|jpeg|png|gif)$/i)) {
        postType = 'image'
      } else if (!post.is_self) {
        postType = 'link'
      }

      // Get subreddit name from plain string property (Snoowrap lazy-loading workaround)
      const subredditName = String(post.subreddit_name_prefixed || '').replace(/^r\//, '') ||
                            String(post.subreddit?.display_name || '')

      return {
        redditId: String(post.name || ''),
        title: String(post.title || ''),
        content: post.selftext ? String(post.selftext) : null,
        url: `https://reddit.com${String(post.permalink || '')}`,
        subreddit: subredditName,
        postType,
        score: Number(post.score || 0),
        upvoteRatio: Number(post.upvote_ratio || 0),
        commentCount: Number(post.num_comments || 0),
        awards: Number(post.total_awards_received || 0),
        postedAt: new Date(Number(post.created_utc || 0) * 1000),
      }
    })

    // Get the 'after' token for pagination from the listing
    const afterToken = submissions.length > 0 ? String(submissions[submissions.length - 1]?.name || '') : null

    return {
      posts,
      after: submissions.length === limit ? afterToken : null,
    }
  } catch (error: any) {
    console.error(`Error fetching posts for ${username}:`, error.message || error)
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

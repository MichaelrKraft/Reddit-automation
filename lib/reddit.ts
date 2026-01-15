import snoowrap from 'snoowrap'

// Using 'any' type to avoid snoowrap's circular type reference issue
// See: https://github.com/not-an-aardvark/snoowrap/issues/221
let redditClient: any = null

export function getRedditClient(): any {
  if (!redditClient) {
    const clientId = process.env.REDDIT_CLIENT_ID
    const clientSecret = process.env.REDDIT_CLIENT_SECRET
    const username = process.env.REDDIT_USERNAME
    const password = process.env.REDDIT_PASSWORD

    // Validate all required credentials are present
    if (!clientId || !clientSecret || !username || !password) {
      const missing = []
      if (!clientId) missing.push('REDDIT_CLIENT_ID')
      if (!clientSecret) missing.push('REDDIT_CLIENT_SECRET')
      if (!username) missing.push('REDDIT_USERNAME')
      if (!password) missing.push('REDDIT_PASSWORD')
      throw new Error(`Missing Reddit API credentials: ${missing.join(', ')}. Please check your .env.local file.`)
    }

    redditClient = new snoowrap({
      userAgent: 'RedditAutomation/1.0.0',
      clientId,
      clientSecret,
      username,
      password,
    })
  }

  return redditClient
}

export interface PostOptions {
  subreddit: string
  title: string
  text?: string
  url?: string
  flairId?: string
  flairText?: string
}

export async function submitPost(options: PostOptions): Promise<any> {
  const reddit = getRedditClient()
  const subreddit = reddit.getSubreddit(options.subreddit)

  // Build flair options if provided
  const flairOptions = options.flairId ? {
    flair_id: options.flairId,
    flair_text: options.flairText || undefined,
  } : {}

  if (options.url) {
    return await subreddit.submitLink({
      title: options.title,
      url: options.url,
      ...flairOptions,
    })
  } else {
    return await subreddit.submitSelfpost({
      title: options.title,
      text: options.text || '',
      ...flairOptions,
    })
  }
}

export async function getSubredditInfo(subredditName: string): Promise<any> {
  const reddit = getRedditClient()
  const subreddit = reddit.getSubreddit(subredditName)

  return {
    name: subreddit.display_name,
    displayName: await subreddit.display_name_prefixed,
    subscribers: await subreddit.subscribers,
    description: await subreddit.public_description,
  }
}

export async function searchSubreddits(query: string, limit: number = 10): Promise<any[]> {
  // Use Reddit's public JSON API for more reliable subreddit search
  // This doesn't require authentication and has better reliability than snoowrap
  const url = `https://www.reddit.com/subreddits/search.json?q=${encodeURIComponent(query)}&limit=${limit}`

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'RedRide/1.0.0'
    }
  })

  if (!response.ok) {
    throw new Error(`Reddit API error: ${response.status}`)
  }

  const data = await response.json()

  return (data.data?.children || []).map((child: any) => ({
    name: child.data.display_name,
    displayName: child.data.display_name_prefixed,
    subscribers: child.data.subscribers,
    description: child.data.public_description,
  }))
}

export interface SubredditFlair {
  id: string
  text: string
  textEditable: boolean
  backgroundColor: string
  textColor: string
}

export type TimeFilter = 'all' | 'year' | 'month' | 'week' | 'day' | 'hour'

export interface TopPost {
  id: string
  title: string
  content: string | null
  score: number
  numComments: number
  upvoteRatio: number
  author: string
  createdAt: Date
  url: string
  permalink: string
  postType: 'text' | 'link' | 'image'
}

export async function fetchTopPosts(
  subredditName: string,
  limit: number = 25,
  timeFilter: TimeFilter = 'all'
): Promise<TopPost[]> {
  const reddit = getRedditClient()
  const subreddit = reddit.getSubreddit(subredditName)

  try {
    const posts = await subreddit.getTop({
      limit,
      time: timeFilter
    })

    return posts.map((post: any) => ({
      id: post.id,
      title: post.title,
      content: post.selftext || null,
      score: post.score,
      numComments: post.num_comments,
      upvoteRatio: post.upvote_ratio,
      author: post.author?.name || '[deleted]',
      createdAt: new Date(post.created_utc * 1000),
      url: post.url,
      permalink: `https://reddit.com${post.permalink}`,
      postType: post.is_self ? 'text' : (post.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image' : 'link')
    }))
  } catch (error: any) {
    console.error(`[Reddit] Failed to fetch top posts for r/${subredditName}:`, error.message)
    throw new Error(`Failed to fetch top posts: ${error.message}`)
  }
}

export async function getSubredditFlairs(subredditName: string): Promise<SubredditFlair[]> {
  const reddit = getRedditClient()
  const subreddit = reddit.getSubreddit(subredditName)

  try {
    // getLinkFlairTemplates returns flairs available for posts
    const flairs = await subreddit.getLinkFlairTemplates()

    return flairs.map((flair: any) => ({
      id: flair.flair_template_id,
      text: flair.flair_text,
      textEditable: flair.flair_text_editable || false,
      backgroundColor: flair.background_color || '',
      textColor: flair.text_color || 'dark',
    }))
  } catch (error: any) {
    // Some subreddits don't have flairs or restrict access
    console.log(`[Reddit] Could not fetch flairs for r/${subredditName}:`, error.message)
    return []
  }
}

/**
 * Phase 3: Subreddit Rules Integration
 * Fetch community guidelines and rules from a subreddit.
 * Used to inform AI post generation to avoid rule violations.
 */
export interface SubredditRule {
  shortName: string      // e.g., "No Self-Promotion"
  description: string    // Full rule text
  priority: number       // Rule order (1-based)
  violationReason: string // What happens if violated
  kind: string           // "all", "link", "comment"
}

export async function getSubredditRules(subredditName: string): Promise<SubredditRule[]> {
  const reddit = getRedditClient()
  const subreddit = reddit.getSubreddit(subredditName)

  try {
    // getRules() returns the subreddit's posting rules
    const rulesResponse = await subreddit.getRules()

    // Extract rules from the response
    const rules = rulesResponse.rules || []

    return rules.map((rule: any, index: number) => ({
      shortName: rule.short_name || `Rule ${index + 1}`,
      description: rule.description || rule.short_name || '',
      priority: index + 1,
      violationReason: rule.violation_reason || 'Post removal',
      kind: rule.kind || 'all', // "all", "link", or "comment"
    }))
  } catch (error: any) {
    // Some subreddits may not have rules accessible or may restrict access
    console.log(`[Reddit] Could not fetch rules for r/${subredditName}:`, error.message)
    return []
  }
}

/**
 * Get subreddit rules, with caching support.
 * Checks if rules are cached in the database first.
 */
export async function getSubredditRulesWithCache(
  subredditName: string,
  prisma: any,
  maxAgeHours: number = 168 // 1 week default cache
): Promise<SubredditRule[]> {
  try {
    // Check if we have cached rules in the database
    const subreddit = await prisma.subreddit.findUnique({
      where: { name: subredditName.toLowerCase() },
      select: { rules: true, rulesUpdatedAt: true }
    })

    // Check if cache is valid
    if (subreddit?.rules && subreddit?.rulesUpdatedAt) {
      const cacheAge = Date.now() - new Date(subreddit.rulesUpdatedAt).getTime()
      const maxAgeMs = maxAgeHours * 60 * 60 * 1000

      if (cacheAge < maxAgeMs) {
        console.log(`[Reddit] Using cached rules for r/${subredditName}`)
        return subreddit.rules as SubredditRule[]
      }
    }

    // Fetch fresh rules from Reddit
    console.log(`[Reddit] Fetching fresh rules for r/${subredditName}`)
    const rules = await getSubredditRules(subredditName)

    // Cache the rules in the database (upsert)
    if (rules.length > 0) {
      await prisma.subreddit.upsert({
        where: { name: subredditName.toLowerCase() },
        update: {
          rules: rules as any,
          rulesUpdatedAt: new Date()
        },
        create: {
          name: subredditName.toLowerCase(),
          displayName: `r/${subredditName}`,
          rules: rules as any,
          rulesUpdatedAt: new Date()
        }
      })
    }

    return rules
  } catch (error: any) {
    console.error(`[Reddit] Error getting rules with cache for r/${subredditName}:`, error.message)
    // Fallback to direct fetch
    return getSubredditRules(subredditName)
  }
}

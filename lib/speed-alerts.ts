import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export interface RedditPost {
  id: string
  title: string
  url: string
  author: string
  subreddit: string
  created_utc: number
  selftext?: string
}

/**
 * Check if a post is asking a question
 * Detects question patterns in the title
 */
export function isQuestionPost(title: string): boolean {
  const lowerTitle = title.toLowerCase().trim()

  // Check if title ends with a question mark
  if (title.trim().endsWith('?')) {
    return true
  }

  // Common question starters
  const questionStarters = [
    'how ', 'what ', 'why ', 'when ', 'where ', 'who ', 'which ',
    'can ', 'could ', 'should ', 'would ', 'will ', 'is ', 'are ',
    'does ', 'do ', 'did ', 'has ', 'have ', 'am i ', 'anyone ',
    'anybody ', 'any tips', 'any advice', 'any suggestions',
    'help me', 'need help', 'looking for advice', 'seeking advice'
  ]

  return questionStarters.some(starter => lowerTitle.startsWith(starter))
}

export interface GeneratedComment {
  style: 'helpful' | 'curious' | 'supportive'
  text: string
}

/**
 * Fetch new posts from a subreddit using Reddit's public JSON API
 * Returns empty array on rate limiting (403/429) instead of throwing
 */
export async function fetchNewPosts(subreddit: string, limit: number = 10): Promise<RedditPost[]> {
  try {
    // Add a small random delay to avoid hitting rate limits
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500))

    const response = await fetch(
      `https://www.reddit.com/r/${subreddit}/new.json?limit=${limit}`,
      {
        headers: {
          // Reddit-compliant User-Agent format
          'User-Agent': 'web:reddride:v1.0.0 (by /u/reddride_app)',
          'Accept': 'application/json',
        },
        // Don't cache to get fresh results
        cache: 'no-store',
      }
    )

    // Handle rate limiting gracefully - return empty array, don't crash
    if (response.status === 403 || response.status === 429) {
      console.warn(`[Speed Alerts] Reddit rate limiting r/${subreddit} (${response.status}), will retry next cycle`)
      return []
    }

    if (!response.ok) {
      console.error(`[Speed Alerts] Reddit API error for r/${subreddit}: ${response.status}`)
      return []
    }

    const data = await response.json()

    if (!data?.data?.children) {
      console.warn(`[Speed Alerts] Unexpected response format for r/${subreddit}`)
      return []
    }

    return data.data.children.map((child: any) => ({
      id: child.data.id,
      title: child.data.title,
      url: `https://www.reddit.com${child.data.permalink}`,
      author: child.data.author,
      subreddit: child.data.subreddit,
      created_utc: child.data.created_utc,
      selftext: child.data.selftext,
    }))
  } catch (error: any) {
    // Network errors - log and return empty array instead of crashing
    console.error(`[Speed Alerts] Network error fetching r/${subreddit}:`, error.message)
    return []
  }
}

/**
 * Generate 3 AI-powered comment options for a Reddit post
 */
export async function generateCommentOptions(post: RedditPost): Promise<GeneratedComment[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const prompt = `
You are helping a user respond to a new Reddit post quickly. Generate 3 different comment options.

Post Details:
- Subreddit: r/${post.subreddit}
- Title: ${post.title}
- Content: ${post.selftext?.slice(0, 500) || '(No text content)'}
- Author: u/${post.author}

Generate 3 distinct comment styles:
1. HELPFUL: Provide useful information, advice, or resources
2. CURIOUS: Ask a thoughtful follow-up question to engage the OP
3. SUPPORTIVE: Show empathy, validation, or encouragement

Requirements:
- Be authentic and natural (no robotic language)
- Match the subreddit's culture and tone
- Keep each comment 2-4 sentences
- Don't be promotional or spammy
- Be genuinely helpful to the community

Return ONLY valid JSON in this exact format:
[
  {"style": "helpful", "text": "Your helpful comment here"},
  {"style": "curious", "text": "Your curious/questioning comment here"},
  {"style": "supportive", "text": "Your supportive comment here"}
]
`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return parsed as GeneratedComment[]
    }

    // Fallback if JSON parsing fails
    return [
      { style: 'helpful', text: 'Thanks for sharing, keep up the good work!' },
      { style: 'curious', text: 'Interesting topic! What made you decide to explore this?' },
      { style: 'supportive', text: 'This is really insightful, thanks for sharing!' },
    ]
  } catch (error: any) {
    console.error('Failed to generate comments:', error)
    // Return fallback comments
    return [
      { style: 'helpful', text: 'Thanks for sharing, keep up the good work!' },
      { style: 'curious', text: 'I\'d love to hear more about your experience with this.' },
      { style: 'supportive', text: 'Really appreciate you posting this!' },
    ]
  }
}

/**
 * Check for new posts in a subreddit since the last check
 */
export async function checkForNewPosts(
  subreddit: string,
  lastPostId: string | null,
  lastCheckedTime?: Date | null
): Promise<{ newPosts: RedditPost[]; latestPostId: string | null }> {
  const posts = await fetchNewPosts(subreddit, 25)

  if (posts.length === 0) {
    return { newPosts: [], latestPostId: lastPostId }
  }

  const latestPostId = posts[0].id

  if (!lastPostId) {
    // First check - return only the most recent post
    console.log(`[Speed Alerts] r/${subreddit}: First check, returning 1 post`)
    return { newPosts: [posts[0]], latestPostId }
  }

  // If latest post is same as last seen, no new posts
  if (latestPostId === lastPostId) {
    console.log(`[Speed Alerts] r/${subreddit}: No new posts (latest=${latestPostId})`)
    return { newPosts: [], latestPostId }
  }

  // Find posts newer than our last seen
  const newPosts: RedditPost[] = []
  let foundLastPost = false

  for (const post of posts) {
    if (post.id === lastPostId) {
      foundLastPost = true
      break
    }
    newPosts.push(post)
  }

  // If we didn't find the last post in the results, it may have scrolled off
  // In this case, use timestamp-based filtering if available, or limit to recent posts
  if (!foundLastPost && lastCheckedTime) {
    const lastCheckedTimestamp = lastCheckedTime.getTime() / 1000
    const filteredPosts = posts.filter(post => post.created_utc > lastCheckedTimestamp)
    console.log(`[Speed Alerts] r/${subreddit}: Last post scrolled off, found ${filteredPosts.length} posts since last check`)
    return { newPosts: filteredPosts.slice(0, 5), latestPostId } // Limit to 5 to avoid spam
  }

  console.log(`[Speed Alerts] r/${subreddit}: Found ${newPosts.length} new posts`)
  return { newPosts, latestPostId }
}

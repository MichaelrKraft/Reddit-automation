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

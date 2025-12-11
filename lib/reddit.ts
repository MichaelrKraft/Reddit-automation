import snoowrap from 'snoowrap'

// Using 'any' type to avoid snoowrap's circular type reference issue
// See: https://github.com/not-an-aardvark/snoowrap/issues/221
let redditClient: any = null

export function getRedditClient(): any {
  if (!redditClient) {
    redditClient = new snoowrap({
      userAgent: 'RedditAutomation/1.0.0',
      clientId: process.env.REDDIT_CLIENT_ID!,
      clientSecret: process.env.REDDIT_CLIENT_SECRET!,
      username: process.env.REDDIT_USERNAME!,
      password: process.env.REDDIT_PASSWORD!,
    })
  }

  return redditClient
}

export interface PostOptions {
  subreddit: string
  title: string
  text?: string
  url?: string
}

export async function submitPost(options: PostOptions): Promise<any> {
  const reddit = getRedditClient()
  const subreddit = reddit.getSubreddit(options.subreddit)

  if (options.url) {
    return await subreddit.submitLink({
      title: options.title,
      url: options.url,
    })
  } else {
    return await subreddit.submitSelfpost({
      title: options.title,
      text: options.text || '',
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

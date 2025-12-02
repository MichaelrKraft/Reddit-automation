import snoowrap from 'snoowrap'

let redditClient: snoowrap | null = null

export function getRedditClient(): snoowrap {
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

export async function submitPost(options: PostOptions) {
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

export async function getSubredditInfo(subredditName: string) {
  const reddit = getRedditClient()
  const subreddit = reddit.getSubreddit(subredditName)
  
  return {
    name: subreddit.display_name,
    displayName: await subreddit.display_name_prefixed,
    subscribers: await subreddit.subscribers,
    description: await subreddit.public_description,
  }
}

export async function searchSubreddits(query: string, limit: number = 10) {
  const reddit = getRedditClient()
  const results = await reddit.searchSubreddits({ query, limit })
  
  return results.map((sub: any) => ({
    name: sub.display_name,
    displayName: sub.display_name_prefixed,
    subscribers: sub.subscribers,
    description: sub.public_description,
  }))
}

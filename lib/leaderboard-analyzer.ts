import { fetchTopPosts, TimeFilter, TopPost } from './reddit'

export interface UserStats {
  username: string
  posts: { title: string; score: number; comments: number; url: string }[]
  totalScore: number
  postCount: number
  avgScore: number
  avgComments: number
  successRate: number
}

export interface RankedUser extends UserStats {
  rank: number
  influenceScore: number
}

export interface LeaderboardConfig {
  subreddit: string
  timeFilter: TimeFilter
  limit: number
}

/**
 * Analyze a subreddit's top posts to find the most influential contributors
 */
export async function analyzeSubredditContributors(
  config: LeaderboardConfig
): Promise<RankedUser[]> {
  // 1. Fetch top posts from the subreddit
  const topPosts = await fetchTopPosts(config.subreddit, config.limit, config.timeFilter)

  // 2. Group posts by author
  const authorMap = new Map<string, UserStats>()

  for (const post of topPosts) {
    // Skip deleted users
    if (post.author === '[deleted]') continue

    const existing = authorMap.get(post.author) || createEmptyStats(post.author)
    existing.posts.push({
      title: post.title,
      score: post.score,
      comments: post.numComments,
      url: post.permalink
    })
    existing.totalScore += post.score
    existing.postCount++
    authorMap.set(post.author, existing)
  }

  // 3. Calculate averages and success rates
  const contributors = Array.from(authorMap.values()).map(stats => ({
    ...stats,
    avgScore: stats.postCount > 0 ? stats.totalScore / stats.postCount : 0,
    avgComments: stats.posts.reduce((sum, p) => sum + p.comments, 0) / (stats.postCount || 1),
    successRate: (stats.posts.filter(p => p.score >= 100).length / (stats.postCount || 1)) * 100
  }))

  // 4. Calculate influence scores and rank
  return calculateInfluenceScores(contributors)
}

function createEmptyStats(username: string): UserStats {
  return {
    username,
    posts: [],
    totalScore: 0,
    postCount: 0,
    avgScore: 0,
    avgComments: 0,
    successRate: 0
  }
}

/**
 * Calculate influence scores using weighted metrics
 *
 * Weights:
 * - 30% totalScore: Overall impact in the subreddit
 * - 25% avgScore: Consistency of quality content
 * - 20% postCount: Activity level
 * - 15% avgComments: Engagement quality
 * - 10% successRate: Hit rate for viral posts
 */
export function calculateInfluenceScores(contributors: UserStats[]): RankedUser[] {
  if (contributors.length === 0) return []

  // Find max values for normalization
  const maxTotal = Math.max(...contributors.map(c => c.totalScore), 1)
  const maxCount = Math.max(...contributors.map(c => c.postCount), 1)
  const maxAvg = Math.max(...contributors.map(c => c.avgScore), 1)
  const maxComments = Math.max(...contributors.map(c => c.avgComments), 1)

  return contributors
    .map(c => ({
      ...c,
      rank: 0, // Will be set after sorting
      influenceScore: calculateScore(c, maxTotal, maxCount, maxAvg, maxComments)
    }))
    .sort((a, b) => b.influenceScore - a.influenceScore)
    .map((c, i) => ({ ...c, rank: i + 1 }))
}

function calculateScore(
  c: UserStats,
  maxTotal: number,
  maxCount: number,
  maxAvg: number,
  maxComments: number
): number {
  const normalized = {
    totalScore: c.totalScore / maxTotal,
    postCount: c.postCount / maxCount,
    avgScore: c.avgScore / maxAvg,
    avgComments: c.avgComments / maxComments,
    successRate: c.successRate / 100
  }

  // Weighted sum
  const score = (
    normalized.totalScore * 0.30 +
    normalized.avgScore * 0.25 +
    normalized.postCount * 0.20 +
    normalized.avgComments * 0.15 +
    normalized.successRate * 0.10
  ) * 100

  return Math.round(score * 10) / 10 // Round to 1 decimal
}

/**
 * Format numbers for display (e.g., 1500 -> "1.5K")
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

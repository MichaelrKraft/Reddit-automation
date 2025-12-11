import { TrendDirection } from '@prisma/client'

/**
 * Opportunity Scoring Algorithm
 *
 * Based on PRD Section 10.3 weights:
 * - Frequency (30%): How often the topic is mentioned
 * - Engagement (25%): Average upvotes and comments
 * - Sentiment (20%): Emotional intensity (frustration = higher opportunity)
 * - Trend (15%): Recent vs older mentions (growing = higher score)
 * - Market Gap (10%): Competitor analysis potential
 */

export interface ScoringInput {
  // Frequency metrics
  mentionCount: number
  timeWindowDays: number

  // Engagement metrics
  avgUpvotes: number
  avgComments: number
  maxUpvotes: number

  // Sentiment metrics
  avgSentiment: number // -1 to 1

  // Trend metrics
  recentMentions: number // Last 7 days
  olderMentions: number // 8-30 days ago

  // Market gap indicators
  subredditCount: number
  hasCompetitorMentions: boolean
  aiConfidence: number // 0 to 1
}

export interface ScoreBreakdown {
  frequency: number
  engagement: number
  sentiment: number
  trend: number
  marketGap: number
  total: number
}

// Weights from PRD Section 10.3
const WEIGHTS = {
  FREQUENCY: 0.30,
  ENGAGEMENT: 0.25,
  SENTIMENT: 0.20,
  TREND: 0.15,
  MARKET_GAP: 0.10,
}

// Thresholds for normalization
const THRESHOLDS = {
  // Frequency: mentions per day
  HIGH_FREQUENCY: 5,
  MED_FREQUENCY: 2,

  // Engagement
  HIGH_UPVOTES: 500,
  MED_UPVOTES: 100,
  HIGH_COMMENTS: 50,
  MED_COMMENTS: 10,

  // Subreddit spread
  WIDE_SPREAD: 5,
  MED_SPREAD: 3,
}

/**
 * Calculate the opportunity score (0-100)
 */
export function calculateScore(input: ScoringInput): ScoreBreakdown {
  const frequencyScore = calculateFrequencyScore(input)
  const engagementScore = calculateEngagementScore(input)
  const sentimentScore = calculateSentimentScore(input)
  const trendScore = calculateTrendScore(input)
  const marketGapScore = calculateMarketGapScore(input)

  const total = Math.round(
    frequencyScore * WEIGHTS.FREQUENCY +
    engagementScore * WEIGHTS.ENGAGEMENT +
    sentimentScore * WEIGHTS.SENTIMENT +
    trendScore * WEIGHTS.TREND +
    marketGapScore * WEIGHTS.MARKET_GAP
  )

  return {
    frequency: Math.round(frequencyScore),
    engagement: Math.round(engagementScore),
    sentiment: Math.round(sentimentScore),
    trend: Math.round(trendScore),
    marketGap: Math.round(marketGapScore),
    total: Math.min(100, Math.max(0, total)),
  }
}

/**
 * Frequency Score (0-100)
 * Higher frequency = higher score
 */
function calculateFrequencyScore(input: ScoringInput): number {
  const mentionsPerDay = input.mentionCount / Math.max(1, input.timeWindowDays)

  if (mentionsPerDay >= THRESHOLDS.HIGH_FREQUENCY) {
    return 100
  } else if (mentionsPerDay >= THRESHOLDS.MED_FREQUENCY) {
    // Linear interpolation between 60-100
    const ratio = (mentionsPerDay - THRESHOLDS.MED_FREQUENCY) /
                  (THRESHOLDS.HIGH_FREQUENCY - THRESHOLDS.MED_FREQUENCY)
    return 60 + ratio * 40
  } else if (mentionsPerDay >= 0.5) {
    // Linear interpolation between 30-60
    const ratio = (mentionsPerDay - 0.5) / (THRESHOLDS.MED_FREQUENCY - 0.5)
    return 30 + ratio * 30
  } else {
    // Low frequency but still mentioned
    return Math.max(10, mentionsPerDay * 60)
  }
}

/**
 * Engagement Score (0-100)
 * Higher engagement = higher score
 */
function calculateEngagementScore(input: ScoringInput): number {
  // Upvotes contribute 60% of engagement score
  let upvoteScore = 0
  if (input.avgUpvotes >= THRESHOLDS.HIGH_UPVOTES) {
    upvoteScore = 100
  } else if (input.avgUpvotes >= THRESHOLDS.MED_UPVOTES) {
    const ratio = (input.avgUpvotes - THRESHOLDS.MED_UPVOTES) /
                  (THRESHOLDS.HIGH_UPVOTES - THRESHOLDS.MED_UPVOTES)
    upvoteScore = 50 + ratio * 50
  } else {
    upvoteScore = Math.min(50, (input.avgUpvotes / THRESHOLDS.MED_UPVOTES) * 50)
  }

  // Comments contribute 40% of engagement score
  let commentScore = 0
  if (input.avgComments >= THRESHOLDS.HIGH_COMMENTS) {
    commentScore = 100
  } else if (input.avgComments >= THRESHOLDS.MED_COMMENTS) {
    const ratio = (input.avgComments - THRESHOLDS.MED_COMMENTS) /
                  (THRESHOLDS.HIGH_COMMENTS - THRESHOLDS.MED_COMMENTS)
    commentScore = 50 + ratio * 50
  } else {
    commentScore = Math.min(50, (input.avgComments / THRESHOLDS.MED_COMMENTS) * 50)
  }

  // Bonus for viral posts (max upvotes significantly higher than average)
  let viralBonus = 0
  if (input.maxUpvotes > input.avgUpvotes * 3 && input.maxUpvotes > THRESHOLDS.HIGH_UPVOTES) {
    viralBonus = 10
  }

  return Math.min(100, upvoteScore * 0.6 + commentScore * 0.4 + viralBonus)
}

/**
 * Sentiment Score (0-100)
 * More negative sentiment = higher opportunity (pain points)
 * Strong emotions (positive or negative) = higher score
 */
function calculateSentimentScore(input: ScoringInput): number {
  const sentiment = input.avgSentiment

  // Negative sentiment is a stronger signal for opportunities
  // -1 = very negative = 100 score
  // 0 = neutral = 50 score
  // +1 = very positive = 30 score (still some opportunity for positive topics)

  if (sentiment <= -0.5) {
    // Strong negative: 80-100
    return 80 + Math.abs(sentiment + 0.5) * 40
  } else if (sentiment <= 0) {
    // Mild negative to neutral: 50-80
    return 50 + Math.abs(sentiment) * 60
  } else if (sentiment <= 0.5) {
    // Mild positive: 30-50
    return 50 - sentiment * 40
  } else {
    // Strong positive: 20-30
    return 30 - (sentiment - 0.5) * 20
  }
}

/**
 * Trend Score (0-100)
 * Growing trends = higher score
 */
function calculateTrendScore(input: ScoringInput): number {
  const recent = input.recentMentions || 0
  const older = input.olderMentions || 0

  if (recent === 0 && older === 0) {
    return 50 // Neutral for new opportunities
  }

  if (older === 0 && recent > 0) {
    return 100 // Brand new trending topic
  }

  const growthRatio = recent / Math.max(1, older)

  if (growthRatio >= 2) {
    // Doubling or more = strong growth
    return 100
  } else if (growthRatio >= 1.5) {
    // 50%+ growth
    return 85
  } else if (growthRatio >= 1) {
    // Stable to slight growth
    return 70
  } else if (growthRatio >= 0.5) {
    // Declining but still active
    return 50
  } else {
    // Rapidly declining
    return 30
  }
}

/**
 * Market Gap Score (0-100)
 * Cross-subreddit spread + competitor mentions = higher opportunity
 */
function calculateMarketGapScore(input: ScoringInput): number {
  let score = 0

  // Subreddit spread (40% of market gap)
  if (input.subredditCount >= THRESHOLDS.WIDE_SPREAD) {
    score += 40
  } else if (input.subredditCount >= THRESHOLDS.MED_SPREAD) {
    score += 30
  } else if (input.subredditCount >= 2) {
    score += 20
  } else {
    score += 10
  }

  // Competitor mentions (30% of market gap)
  if (input.hasCompetitorMentions) {
    score += 30
  }

  // AI confidence as proxy for clear market signal (30%)
  score += input.aiConfidence * 30

  return Math.min(100, score)
}

/**
 * Determine trend direction based on mention patterns
 */
export function determineTrendDirection(
  recentMentions: number,
  olderMentions: number
): TrendDirection {
  if (olderMentions === 0 && recentMentions > 0) {
    return 'GROWING'
  }

  if (recentMentions === 0 && olderMentions > 0) {
    return 'DECLINING'
  }

  const ratio = recentMentions / Math.max(1, olderMentions)

  if (ratio >= 1.3) {
    return 'GROWING'
  } else if (ratio <= 0.7) {
    return 'DECLINING'
  } else {
    return 'STABLE'
  }
}

/**
 * Recalculate score for an existing opportunity
 */
export function recalculateOpportunityScore(
  evidence: Array<{
    upvotes: number
    commentCount: number
    sentimentScore: number | null
    postedAt: Date
    subreddit: string
  }>,
  aiConfidence: number = 0.7,
  hasCompetitorMentions: boolean = false
): { score: ScoreBreakdown; trendDirection: TrendDirection } {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Calculate metrics from evidence
  const upvotes = evidence.map((e) => e.upvotes)
  const comments = evidence.map((e) => e.commentCount)
  const sentiments = evidence
    .map((e) => e.sentimentScore)
    .filter((s): s is number => s !== null)

  const recentEvidence = evidence.filter((e) => e.postedAt >= sevenDaysAgo)
  const olderEvidence = evidence.filter(
    (e) => e.postedAt < sevenDaysAgo && e.postedAt >= thirtyDaysAgo
  )

  const uniqueSubreddits = new Set(evidence.map((e) => e.subreddit))

  const input: ScoringInput = {
    mentionCount: evidence.length,
    timeWindowDays: 30,
    avgUpvotes: upvotes.reduce((a, b) => a + b, 0) / Math.max(1, upvotes.length),
    avgComments: comments.reduce((a, b) => a + b, 0) / Math.max(1, comments.length),
    maxUpvotes: Math.max(0, ...upvotes),
    avgSentiment: sentiments.length > 0
      ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length
      : 0,
    recentMentions: recentEvidence.length,
    olderMentions: olderEvidence.length,
    subredditCount: uniqueSubreddits.size,
    hasCompetitorMentions,
    aiConfidence,
  }

  const score = calculateScore(input)
  const trendDirection = determineTrendDirection(
    recentEvidence.length,
    olderEvidence.length
  )

  return { score, trendDirection }
}

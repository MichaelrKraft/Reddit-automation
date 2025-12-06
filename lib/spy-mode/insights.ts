// Spy Mode - AI Insights Generation (On-Demand)
// Uses Google Gemini 2.0 Flash for cost-effective intelligence

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { RedditPost, PostAnalytics } from './tracker'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export interface SpyInsight {
  insightType: 'pattern' | 'timing' | 'subreddit' | 'recommendation'
  title: string
  description: string
  actionItems: string[]
  confidence: number
}

export async function generateInsights(
  username: string,
  posts: RedditPost[],
  analytics: PostAnalytics
): Promise<SpyInsight[]> {
  if (posts.length === 0) {
    return [{
      insightType: 'pattern',
      title: 'Insufficient Data',
      description: 'This account has no posts to analyze.',
      actionItems: ['Wait for the account to post content before generating insights.'],
      confidence: 1.0,
    }]
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

  // Prepare top 10 posts for analysis
  const topPosts = [...posts]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(p => `- "${p.title}" (r/${p.subreddit}, ${p.score} upvotes, ${p.commentCount} comments)`)
    .join('\n')

  // Prepare subreddit data
  const subredditData = analytics.topSubreddits
    .slice(0, 5)
    .map(s => `- r/${s.name}: ${s.count} posts, avg ${s.avgScore} score`)
    .join('\n')

  // Prepare timing data
  const peakHours = analytics.postingHeatmap
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 3)
    .map(h => {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      return `${days[h.day]} ${h.hour}:00 (avg ${h.avgScore} score)`
    })
    .join(', ')

  const prompt = `Analyze this Reddit account's posting strategy and provide actionable competitive intelligence.

USERNAME: u/${username}
TOTAL POSTS ANALYZED: ${posts.length}
AVERAGE SCORE: ${analytics.avgScore}
SUCCESS RATE (100+ upvotes): ${analytics.successRate}%
POSTS PER WEEK: ${analytics.postsPerWeek}

TOP 10 PERFORMING POSTS:
${topPosts}

SUBREDDIT DISTRIBUTION:
${subredditData}

PEAK POSTING TIMES:
${peakHours || 'Insufficient data'}

Provide exactly 5 insights in JSON format. Each insight should be specific and actionable.
Focus on patterns that can be replicated for marketing success.

Return a JSON array with this exact structure:
[
  {
    "insightType": "pattern" | "timing" | "subreddit" | "recommendation",
    "title": "Brief insight title (max 50 chars)",
    "description": "Detailed explanation of the pattern or insight (2-3 sentences)",
    "actionItems": ["Specific action 1", "Specific action 2"],
    "confidence": 0.7 to 1.0
  }
]

Include insights about:
1. Title patterns that drive engagement (word count, question format, numbers, etc.)
2. Optimal posting times based on their success
3. Most effective subreddits for their content
4. Content style observations (length, formatting, tone)
5. One tactical recommendation to replicate their success`

  try {
    const result = await model.generateContent(prompt)
    const response = result.response.text()

    // Extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('No JSON array found in response')
    }

    const insights: SpyInsight[] = JSON.parse(jsonMatch[0])
    return insights
  } catch (error) {
    console.error('Error generating insights:', error)

    // Return fallback insights based on analytics
    return generateFallbackInsights(analytics)
  }
}

function generateFallbackInsights(analytics: PostAnalytics): SpyInsight[] {
  const insights: SpyInsight[] = []

  // Subreddit insight
  if (analytics.topSubreddits.length > 0) {
    const top = analytics.topSubreddits[0]
    insights.push({
      insightType: 'subreddit',
      title: `Primary Subreddit: r/${top.name}`,
      description: `This account focuses heavily on r/${top.name} with ${top.count} posts averaging ${top.avgScore} upvotes. Consider targeting this subreddit for similar content.`,
      actionItems: [
        `Monitor r/${top.name} for trending topics`,
        `Study the top posts in r/${top.name} for formatting patterns`,
      ],
      confidence: 0.8,
    })
  }

  // Success rate insight
  insights.push({
    insightType: 'pattern',
    title: `${analytics.successRate}% Success Rate`,
    description: `${analytics.successRate}% of posts reach 100+ upvotes. ${analytics.successRate > 20 ? 'This indicates a well-optimized posting strategy worth studying.' : 'There may be room for improvement in content optimization.'}`,
    actionItems: [
      'Analyze successful posts for common patterns',
      'Compare title lengths of top vs. average posts',
    ],
    confidence: 0.85,
  })

  // Posting frequency insight
  insights.push({
    insightType: 'timing',
    title: `${analytics.postsPerWeek} Posts/Week`,
    description: `This account maintains a ${analytics.postsPerWeek >= 5 ? 'high' : analytics.postsPerWeek >= 2 ? 'moderate' : 'low'} posting frequency. ${analytics.postsPerWeek >= 3 ? 'Consistency appears to be part of their strategy.' : 'Quality over quantity may be their approach.'}`,
    actionItems: [
      `Consider matching their ${analytics.postsPerWeek.toFixed(1)} posts/week frequency`,
      'Track engagement patterns at different frequencies',
    ],
    confidence: 0.75,
  })

  // Peak timing insight
  if (analytics.postingHeatmap.length > 0) {
    const peak = analytics.postingHeatmap.sort((a, b) => b.avgScore - a.avgScore)[0]
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    insights.push({
      insightType: 'timing',
      title: `Best Time: ${days[peak.day]} ${peak.hour}:00`,
      description: `Posts on ${days[peak.day]} at ${peak.hour}:00 perform best with an average score of ${peak.avgScore}. Timing your posts similarly could improve engagement.`,
      actionItems: [
        `Schedule content for ${days[peak.day]} around ${peak.hour}:00`,
        'Test posting within a 2-hour window of this time',
      ],
      confidence: 0.7,
    })
  }

  // Engagement insight
  insights.push({
    insightType: 'recommendation',
    title: 'Engagement Strategy',
    description: `With an average of ${analytics.avgComments} comments per post, ${analytics.avgComments >= 20 ? 'this account generates significant discussion. Study their engagement-driving techniques.' : 'focus on creating more discussion-worthy content.'}`,
    actionItems: [
      'End posts with questions to encourage comments',
      'Respond quickly to early comments to boost visibility',
    ],
    confidence: 0.8,
  })

  return insights.slice(0, 5)
}

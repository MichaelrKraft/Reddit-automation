import { generateCompletion } from './ai'

export interface RelevanceResult {
  score: number  // 0-100
  reason: string // Brief explanation
  category: 'low' | 'moderate' | 'high' | 'very_high'
}

export interface BusinessContext {
  businessName?: string
  description?: string
  keywords?: string[]
  painPoints?: string[]
  targetAudience?: string[]
}

export interface RedditPost {
  title: string
  content?: string
  subreddit: string
  author?: string
}

/**
 * Get the category based on score
 */
function getCategory(score: number): 'low' | 'moderate' | 'high' | 'very_high' {
  if (score >= 81) return 'very_high'
  if (score >= 61) return 'high'
  if (score >= 30) return 'moderate'
  return 'low'
}

/**
 * Score a Reddit post's relevance to a user's business
 *
 * Scoring scale:
 * - Low (0-29%): Generic discussions, minimal connection to business/keywords
 * - Moderate (30-60%): Some keyword matches but may lack context
 * - High (61-80%): Strong keyword matches and good context
 * - Very High (81-100%): Direct questions or discussions about product/business area
 */
export async function scoreRelevance(
  post: RedditPost,
  businessContext: BusinessContext
): Promise<RelevanceResult> {
  // If no business context, return a default low score
  if (!businessContext.description && (!businessContext.keywords || businessContext.keywords.length === 0)) {
    return {
      score: 0,
      reason: 'No business context available. Please analyze your business URL first.',
      category: 'low'
    }
  }

  const prompt = `
You are a Reddit marketing expert. Score how relevant this Reddit post is to a business's marketing goals.

## BUSINESS CONTEXT:
Business: ${businessContext.businessName || 'Unknown'}
Description: ${businessContext.description || 'Not provided'}
Target Keywords: ${businessContext.keywords?.join(', ') || 'None specified'}
Pain Points They Solve: ${businessContext.painPoints?.join(', ') || 'None specified'}
Target Audience: ${businessContext.targetAudience?.join(', ') || 'Not specified'}

## REDDIT POST:
Subreddit: r/${post.subreddit}
Title: ${post.title}
Content: ${post.content?.slice(0, 1000) || '[No text content]'}
Author: u/${post.author || 'unknown'}

## SCORING CRITERIA:

**Low (0-29%):** Generic discussions with minimal connection to the business. No keyword matches. Topics unrelated to the business's domain.

**Moderate (30-60%):** Some keyword matches but lacks direct context. Related industry discussion but not a buying/help-seeking moment. General questions in the right space.

**High (61-80%):** Strong keyword matches with good context. User is discussing problems the business solves. Opportunity to provide helpful expertise.

**Very High (81-100%):** Direct questions about the product category. User actively seeking solutions. Perfect opportunity to engage. High purchase intent signals.

## RESPONSE FORMAT:
Return ONLY valid JSON:
{
  "score": <number 0-100>,
  "reason": "<one sentence explaining the score>"
}

Be specific about WHY this score - mention which keywords matched, what signals you saw, etc.
`

  try {
    const text = await generateCompletion(prompt)

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      const score = Math.min(100, Math.max(0, Math.round(parsed.score || 0)))

      return {
        score,
        reason: parsed.reason || 'Score calculated based on keyword and context analysis.',
        category: getCategory(score)
      }
    }

    // Fallback if parsing fails
    console.warn('[RelevanceScorer] Failed to parse AI response, using fallback')
    return {
      score: 25,
      reason: 'Unable to analyze - using default score.',
      category: 'low'
    }
  } catch (error: any) {
    console.error('[RelevanceScorer] Error scoring relevance:', error.message)
    // Return a neutral score on error rather than failing
    return {
      score: 25,
      reason: 'Scoring temporarily unavailable.',
      category: 'low'
    }
  }
}

/**
 * Batch score multiple posts for efficiency
 * Useful when scanning a subreddit and want to score all new posts at once
 */
export async function batchScoreRelevance(
  posts: RedditPost[],
  businessContext: BusinessContext
): Promise<Map<string, RelevanceResult>> {
  const results = new Map<string, RelevanceResult>()

  // Score posts in parallel (with a limit to avoid rate limiting)
  const BATCH_SIZE = 5
  for (let i = 0; i < posts.length; i += BATCH_SIZE) {
    const batch = posts.slice(i, i + BATCH_SIZE)
    const promises = batch.map(async (post) => {
      const result = await scoreRelevance(post, businessContext)
      // Use title as key since we don't have a unique ID here
      results.set(post.title, result)
    })
    await Promise.all(promises)
  }

  return results
}

/**
 * Get UI-friendly color for a relevance category
 */
export function getRelevanceColor(category: 'low' | 'moderate' | 'high' | 'very_high'): string {
  switch (category) {
    case 'very_high': return '#A855F7' // purple
    case 'high': return '#22C55E' // green
    case 'moderate': return '#EAB308' // yellow
    case 'low': return '#EF4444' // red
  }
}

/**
 * Get UI-friendly label for a relevance category
 */
export function getRelevanceLabel(category: 'low' | 'moderate' | 'high' | 'very_high'): string {
  switch (category) {
    case 'very_high': return 'Very High'
    case 'high': return 'High'
    case 'moderate': return 'Moderate'
    case 'low': return 'Low'
  }
}

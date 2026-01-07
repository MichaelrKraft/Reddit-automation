import { generateCompletion } from './ai'

export interface RedditPostInput {
  id: string
  title: string
  content: string
  subreddit: string
  score: number
  commentCount: number
  url: string
  author: string
  postedAt: Date
}

export interface OpportunityAnalysis {
  isOpportunity: boolean
  opportunityText: string
  category: OpportunityCategory
  confidence: number
  rawPost: {
    title: string
    subreddit: string
    score: number
    commentCount: number
    url: string
    author: string
    postedAt: Date
  }
}

export type OpportunityCategory =
  | 'Productivity'
  | 'Business Tools & SaaS'
  | 'Health & Wellness'
  | 'Education & Self Improvement'
  | 'Privacy & Security'
  | 'Media & Entertainment'
  | 'Finance & Fintech'
  | 'Developer Tools'
  | 'Other'

// Map display categories to database enum values
export function mapCategoryToEnum(category: OpportunityCategory): string {
  const mapping: Record<OpportunityCategory, string> = {
    'Productivity': 'PAIN_POINT',
    'Business Tools & SaaS': 'FEATURE_REQUEST',
    'Health & Wellness': 'PAIN_POINT',
    'Education & Self Improvement': 'CONTENT_OPPORTUNITY',
    'Privacy & Security': 'PAIN_POINT',
    'Media & Entertainment': 'CONTENT_OPPORTUNITY',
    'Finance & Fintech': 'FEATURE_REQUEST',
    'Developer Tools': 'FEATURE_REQUEST',
    'Other': 'TRENDING_TOPIC',
  }
  return mapping[category] || 'TRENDING_TOPIC'
}

const OPPORTUNITY_PROMPT = `Analyze this Reddit post and determine if it represents a product/business opportunity.

Post Title: {title}
Post Content: {content}
Subreddit: r/{subreddit}

A post represents a product opportunity if it contains someone:
- Asking for app/tool/product recommendations
- Expressing frustration with existing solutions
- Describing an unmet need or pain point
- Looking for alternatives to existing products
- Complaining about missing features
- Seeking automation or workflow improvements

If this is an opportunity, respond with this exact JSON format:
{
  "isOpportunity": true,
  "opportunityText": "2-3 sentences describing the business opportunity in third person, e.g., 'Users seek a solution that...'",
  "category": "One of: Productivity, Business Tools & SaaS, Health & Wellness, Education & Self Improvement, Privacy & Security, Media & Entertainment, Finance & Fintech, Developer Tools, Other",
  "confidence": 0-100
}

If this is NOT an opportunity (e.g., just discussion, news, memes, self-promotion), respond with:
{
  "isOpportunity": false,
  "opportunityText": "",
  "category": "Other",
  "confidence": 0
}

ONLY respond with valid JSON. No other text.`

export async function analyzePostForOpportunity(
  post: RedditPostInput
): Promise<OpportunityAnalysis> {
  const prompt = OPPORTUNITY_PROMPT
    .replace('{title}', post.title)
    .replace('{content}', post.content || '(no content)')
    .replace('{subreddit}', post.subreddit)

  try {
    const response = await generateCompletion(prompt)

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return createNotOpportunityResult(post)
    }

    const parsed = JSON.parse(jsonMatch[0])

    return {
      isOpportunity: Boolean(parsed.isOpportunity),
      opportunityText: parsed.opportunityText || '',
      category: validateCategory(parsed.category),
      confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 0)),
      rawPost: {
        title: post.title,
        subreddit: post.subreddit,
        score: post.score,
        commentCount: post.commentCount,
        url: post.url,
        author: post.author,
        postedAt: post.postedAt,
      },
    }
  } catch (error) {
    console.error('Error analyzing post for opportunity:', error)
    return createNotOpportunityResult(post)
  }
}

function validateCategory(category: string): OpportunityCategory {
  const validCategories: OpportunityCategory[] = [
    'Productivity',
    'Business Tools & SaaS',
    'Health & Wellness',
    'Education & Self Improvement',
    'Privacy & Security',
    'Media & Entertainment',
    'Finance & Fintech',
    'Developer Tools',
    'Other',
  ]

  if (validCategories.includes(category as OpportunityCategory)) {
    return category as OpportunityCategory
  }
  return 'Other'
}

function createNotOpportunityResult(post: RedditPostInput): OpportunityAnalysis {
  return {
    isOpportunity: false,
    opportunityText: '',
    category: 'Other',
    confidence: 0,
    rawPost: {
      title: post.title,
      subreddit: post.subreddit,
      score: post.score,
      commentCount: post.commentCount,
      url: post.url,
      author: post.author,
      postedAt: post.postedAt,
    },
  }
}

// Batch analyze multiple posts
export async function analyzePostsForOpportunities(
  posts: RedditPostInput[]
): Promise<OpportunityAnalysis[]> {
  const results: OpportunityAnalysis[] = []

  // Process in batches of 5 to avoid rate limits
  const batchSize = 5
  for (let i = 0; i < posts.length; i += batchSize) {
    const batch = posts.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(post => analyzePostForOpportunity(post))
    )
    results.push(...batchResults)

    // Small delay between batches
    if (i + batchSize < posts.length) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  return results
}

// Filter to only opportunities above confidence threshold
export function filterOpportunities(
  analyses: OpportunityAnalysis[],
  minConfidence: number = 50
): OpportunityAnalysis[] {
  return analyses.filter(
    a => a.isOpportunity && a.confidence >= minConfidence
  )
}

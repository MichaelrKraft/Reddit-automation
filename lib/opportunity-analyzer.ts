import { GoogleGenerativeAI } from '@google/generative-ai'
import { OpportunityCategory } from '@prisma/client'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export interface AnalysisResult {
  isOpportunity: boolean
  category: OpportunityCategory
  title: string
  problemStatement: string
  sentiment: number // -1 to 1
  confidence: number // 0 to 1
  themes: string[]
  keywords: string[]
}

export interface RedditPost {
  id: string
  title: string
  selftext: string
  subreddit: string
  author: string
  score: number
  num_comments: number
  created_utc: number
  url: string
}

/**
 * Analyzes a Reddit post to identify market opportunities
 */
export async function analyzePost(post: RedditPost): Promise<AnalysisResult | null> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const postContent = `${post.title}\n\n${post.selftext || ''}`.trim()

  if (postContent.length < 20) {
    return null // Too short to analyze
  }

  const prompt = `
Analyze this Reddit post from r/${post.subreddit} for market opportunities.

Post Title: ${post.title}
Post Content: ${post.selftext || '(no body text)'}
Subreddit: r/${post.subreddit}
Score: ${post.score} upvotes
Comments: ${post.num_comments}

Determine if this post represents a market opportunity. Look for:
1. **Pain Points**: Users expressing frustration with existing solutions
2. **Feature Requests**: Desires for functionality that doesn't exist
3. **Content Opportunities**: Topics with high engagement but limited content
4. **Competitor Gaps**: Mentions of competitor weaknesses
5. **Trending Topics**: Emerging trends or interests

Return a JSON response with this exact structure:
{
  "isOpportunity": true/false,
  "category": "PAIN_POINT" | "FEATURE_REQUEST" | "CONTENT_OPPORTUNITY" | "COMPETITOR_GAP" | "TRENDING_TOPIC",
  "title": "Brief opportunity title (max 100 chars)",
  "problemStatement": "2-3 sentence description of the opportunity/problem",
  "sentiment": -1 to 1 (negative to positive sentiment),
  "confidence": 0 to 1 (how confident in this analysis),
  "themes": ["theme1", "theme2", "theme3"],
  "keywords": ["keyword1", "keyword2", "keyword3"]
}

If this is NOT a meaningful opportunity (e.g., meme, off-topic, low value), set isOpportunity to false.

Return ONLY valid JSON, no markdown or explanation.
`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('No JSON found in AI response:', text)
      return null
    }

    const analysis = JSON.parse(jsonMatch[0])

    // Validate the response
    if (typeof analysis.isOpportunity !== 'boolean') {
      return null
    }

    // Validate category enum
    const validCategories: OpportunityCategory[] = [
      'PAIN_POINT',
      'FEATURE_REQUEST',
      'CONTENT_OPPORTUNITY',
      'COMPETITOR_GAP',
      'TRENDING_TOPIC',
    ]

    if (!validCategories.includes(analysis.category)) {
      analysis.category = 'CONTENT_OPPORTUNITY' // Default fallback
    }

    return {
      isOpportunity: analysis.isOpportunity,
      category: analysis.category as OpportunityCategory,
      title: String(analysis.title || '').slice(0, 100),
      problemStatement: String(analysis.problemStatement || ''),
      sentiment: Math.max(-1, Math.min(1, Number(analysis.sentiment) || 0)),
      confidence: Math.max(0, Math.min(1, Number(analysis.confidence) || 0.5)),
      themes: Array.isArray(analysis.themes) ? analysis.themes.slice(0, 5) : [],
      keywords: Array.isArray(analysis.keywords) ? analysis.keywords.slice(0, 10) : [],
    }
  } catch (error: any) {
    console.error('AI analysis failed:', error.message)
    // Return fallback analysis when AI fails
    return createFallbackAnalysis(post)
  }
}

/**
 * Creates a basic fallback analysis when AI is unavailable
 * Uses simple heuristics to categorize posts
 */
function createFallbackAnalysis(post: RedditPost): AnalysisResult {
  const content = `${post.title} ${post.selftext}`.toLowerCase()

  // Improved keyword-based categorization with weighted scoring
  const categoryScores = {
    FEATURE_REQUEST: 0,
    PAIN_POINT: 0,
    COMPETITOR_GAP: 0,
    TRENDING_TOPIC: 0,
    CONTENT_OPPORTUNITY: 0,
  }

  // Feature Request patterns
  const featurePatterns = ['feature', 'wish', 'please add', 'would be nice', 'should have', 'need a', 'want a', 'requesting', 'suggestion', 'idea for', 'how about', 'can we get', 'would love', 'missing', 'lack of']
  for (const pattern of featurePatterns) {
    if (content.includes(pattern)) categoryScores.FEATURE_REQUEST += 2
  }

  // Pain Point patterns
  const painPatterns = ['frustrated', 'annoying', 'problem', 'issue', 'bug', 'broken', 'not working', 'doesn\'t work', 'can\'t', 'unable to', 'error', 'fail', 'crash', 'slow', 'terrible', 'awful', 'hate', 'worst', 'useless', 'limit', 'usage', 'expensive', 'cost', 'price']
  for (const pattern of painPatterns) {
    if (content.includes(pattern)) categoryScores.PAIN_POINT += 2
  }

  // Competitor Gap patterns
  const competitorPatterns = ['vs ', 'versus', 'compared to', 'better than', 'worse than', 'alternative', 'switch from', 'switch to', 'chatgpt', 'gpt-4', 'gemini', 'copilot', 'cursor', 'openai', 'anthropic', 'difference between']
  for (const pattern of competitorPatterns) {
    if (content.includes(pattern)) categoryScores.COMPETITOR_GAP += 2
  }

  // Trending Topic patterns
  const trendingPatterns = ['just released', 'announcement', 'breaking', 'update', 'launched', 'introducing', 'finally', 'now available', 'just announced', 'news']
  for (const pattern of trendingPatterns) {
    if (content.includes(pattern)) categoryScores.TRENDING_TOPIC += 2
  }

  // Content Opportunity patterns (questions seeking information)
  const contentPatterns = ['best', 'how to', 'how do', 'what is', 'recommend', 'tutorial', 'guide', 'help me', 'tips', 'advice', 'explain', 'anyone know', 'experience with', 'thoughts on', 'opinion']
  for (const pattern of contentPatterns) {
    if (content.includes(pattern)) categoryScores.CONTENT_OPPORTUNITY += 2
  }

  // High engagement with questions = Content Opportunity
  if ((content.includes('?') || content.includes('how') || content.includes('what')) && post.num_comments >= 5) {
    categoryScores.CONTENT_OPPORTUNITY += 3
  }

  // Find highest scoring category
  let category: OpportunityCategory = 'CONTENT_OPPORTUNITY'
  let maxScore = 0
  for (const [cat, score] of Object.entries(categoryScores)) {
    if (score > maxScore) {
      maxScore = score
      category = cat as OpportunityCategory
    }
  }

  // Determine if it's likely an opportunity based on engagement
  const isOpportunity = post.score >= 5 || post.num_comments >= 3 || post.selftext.length > 100

  return {
    isOpportunity,
    category,
    title: post.title.slice(0, 100),
    problemStatement: post.selftext ? post.selftext.slice(0, 300) : `Post from r/${post.subreddit} with ${post.score} upvotes`,
    sentiment: 0, // Neutral when we can't analyze
    confidence: 0.3, // Low confidence for fallback
    themes: [post.subreddit],
    keywords: extractKeywords(post.title),
  }
}

/**
 * Extract simple keywords from title
 */
function extractKeywords(title: string): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because', 'until', 'while', 'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their'])

  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 5)
}

/**
 * Batch analyze multiple posts
 */
export async function analyzePostsBatch(
  posts: RedditPost[],
  concurrency: number = 3
): Promise<Map<string, AnalysisResult>> {
  const results = new Map<string, AnalysisResult>()

  // Process in batches to avoid rate limiting
  for (let i = 0; i < posts.length; i += concurrency) {
    const batch = posts.slice(i, i + concurrency)
    const batchResults = await Promise.all(
      batch.map(async (post) => {
        const analysis = await analyzePost(post)
        return { postId: post.id, analysis }
      })
    )

    for (const { postId, analysis } of batchResults) {
      if (analysis && analysis.isOpportunity) {
        results.set(postId, analysis)
      }
    }

    // Small delay between batches to avoid rate limiting
    if (i + concurrency < posts.length) {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  return results
}

/**
 * Check similarity between two opportunity titles/statements
 * Uses simple text comparison as fallback when AI is unavailable
 * Returns similarity score 0-1
 */
export async function checkSimilarity(
  text1: string,
  text2: string
): Promise<number> {
  // First try simple text similarity (fast, no API needed)
  const simpleSimilarity = calculateSimpleSimilarity(text1, text2)

  // If texts are very similar or very different, skip AI call
  if (simpleSimilarity > 0.8 || simpleSimilarity < 0.1) {
    return simpleSimilarity
  }

  // Try AI for more nuanced comparison
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const prompt = `
Compare these two texts and determine their semantic similarity.

Text 1: ${text1}
Text 2: ${text2}

Return ONLY a number between 0 and 1:
- 0 = completely different topics
- 0.5 = somewhat related
- 0.85+ = essentially the same topic/opportunity
- 1 = identical meaning

Return ONLY the number, no explanation.
`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text().trim()
    const score = parseFloat(text)

    if (isNaN(score)) {
      return simpleSimilarity
    }

    return Math.max(0, Math.min(1, score))
  } catch (error) {
    console.error('Similarity check failed, using fallback:', error)
    return simpleSimilarity
  }
}

/**
 * Calculate simple text similarity using word overlap
 * Returns 0-1 score based on shared words
 */
function calculateSimpleSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2))
  const words2 = new Set(text2.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2))

  if (words1.size === 0 || words2.size === 0) return 0

  let intersection = 0
  for (const word of words1) {
    if (words2.has(word)) intersection++
  }

  // Jaccard similarity
  const union = words1.size + words2.size - intersection
  return union > 0 ? intersection / union : 0
}

/**
 * Merge similar opportunities by finding the best representative
 */
export async function findDuplicateOpportunity(
  newTitle: string,
  newStatement: string,
  existingOpportunities: Array<{ id: string; title: string; problemStatement: string }>
): Promise<string | null> {
  const SIMILARITY_THRESHOLD = 0.85

  for (const existing of existingOpportunities) {
    const titleSimilarity = await checkSimilarity(newTitle, existing.title)

    if (titleSimilarity >= SIMILARITY_THRESHOLD) {
      return existing.id
    }

    // Also check problem statement for more thorough matching
    const statementSimilarity = await checkSimilarity(
      newStatement,
      existing.problemStatement
    )

    if (statementSimilarity >= SIMILARITY_THRESHOLD) {
      return existing.id
    }
  }

  return null
}

/**
 * Generate AI summary for an opportunity based on evidence
 */
export async function generateOpportunitySummary(
  opportunity: {
    title: string
    category: string
    evidence: Array<{ quoteText: string; subreddit: string }>
  }
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const evidenceText = opportunity.evidence
    .slice(0, 5)
    .map((e, i) => `${i + 1}. [r/${e.subreddit}]: "${e.quoteText.slice(0, 200)}"`)
    .join('\n')

  const prompt = `
Summarize this market opportunity based on Reddit evidence.

Opportunity: ${opportunity.title}
Category: ${opportunity.category}

Evidence from Reddit:
${evidenceText}

Write a 2-3 sentence summary that:
1. Explains the core problem/opportunity
2. Mentions the scale/frequency of the issue
3. Suggests why this matters for businesses

Keep it professional and actionable.
`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text().trim()
  } catch (error) {
    console.error('Summary generation failed:', error)
    return opportunity.title
  }
}

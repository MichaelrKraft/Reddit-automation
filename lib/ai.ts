import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'
import { getViralBodyPrompt, SUBREDDIT_WORD_COUNTS } from './viral-body-score'
import { getSubredditViralConfig } from './viral-score'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

// Generic AI completion with Gemini -> OpenAI fallback
export async function generateCompletion(prompt: string): Promise<string> {
  // Log which services are available
  const hasGemini = !!process.env.GEMINI_API_KEY
  const hasOpenAI = !!process.env.OPENAI_API_KEY

  // Try Gemini first
  if (hasGemini) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
      const result = await model.generateContent(prompt)
      const response = await result.response
      return response.text()
    } catch (error: any) {
      console.error('[AI] Gemini error:', {
        errorType: error.name,
        errorMessage: error.message,
        hasOpenAIFallback: hasOpenAI,
      })
      // If rate limited (429), try OpenAI fallback
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        console.log('[AI] Gemini rate limited, trying OpenAI fallback...')
      } else if (!hasOpenAI) {
        // No fallback available, throw with details
        throw new Error(`Gemini API error: ${error.message}`)
      }
    }
  }

  // Fallback to OpenAI
  if (openai) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096,
      })
      return completion.choices[0]?.message?.content || ''
    } catch (error: any) {
      console.error('[AI] OpenAI error:', {
        errorType: error.name,
        errorMessage: error.message,
      })
      throw new Error(`AI service error: ${error.message}`)
    }
  }

  console.error('[AI] No AI service available:', { hasGemini, hasOpenAI })
  throw new Error('AI service not configured. Please contact support.')
}

// Intent Classification Types
export type IntentType = 'BUYING_SIGNAL' | 'COMPARISON' | 'COMPLAINT' | 'RECOMMENDATION' | 'NEUTRAL'

export interface IntentClassificationResult {
  intentType: IntentType
  intentScore: number  // 0-100 confidence
  buyingSignal: boolean
  reasoning: string
}

/**
 * Classify the intent of a Reddit post to detect buying signals.
 * Used by keyword monitoring to prioritize high-value opportunities.
 */
export async function classifyIntent(
  postTitle: string,
  postBody: string,
  keyword: string
): Promise<IntentClassificationResult> {
  const prompt = `
Analyze this Reddit post for buying intent related to the keyword "${keyword}".

Post Title: ${postTitle}
Post Body: ${postBody?.slice(0, 1500) || '[No body content]'}

Classify the post into ONE of these intent categories:

1. **BUYING_SIGNAL** - User is actively looking for solutions
   - Phrases like: "I need", "looking for", "recommendations for", "best tool for", "anyone know a", "what do you use for", "help me find"
   - Asking for product/service recommendations
   - Ready to purchase or try something

2. **COMPARISON** - User is comparing options
   - Phrases like: "X vs Y", "which is better", "choosing between", "alternative to"
   - Evaluating multiple solutions
   - Close to making a decision

3. **COMPLAINT** - User is frustrated with current solution
   - Phrases like: "hate", "frustrated with", "looking to switch", "X sucks", "problems with"
   - Opportunity to offer alternative
   - Pain point being expressed

4. **RECOMMENDATION** - User is recommending something
   - Phrases like: "you should try", "I recommend", "best X I've found", "switched to"
   - Potential competitor mention
   - Social proof opportunity

5. **NEUTRAL** - General discussion, not actionable
   - News, opinions, general questions
   - No clear purchase intent
   - Low commercial value

Return ONLY valid JSON (no markdown):
{
  "intentType": "BUYING_SIGNAL" or "COMPARISON" or "COMPLAINT" or "RECOMMENDATION" or "NEUTRAL",
  "intentScore": <number 0-100 representing confidence>,
  "buyingSignal": <true if intentType is BUYING_SIGNAL, COMPARISON, or COMPLAINT, false otherwise>,
  "reasoning": "<brief explanation of why this classification>"
}
`

  try {
    const text = await generateCompletion(prompt)

    // Clean up response
    let cleanText = text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()

    // Extract JSON object
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])

        // Validate and return
        const validIntentTypes: IntentType[] = ['BUYING_SIGNAL', 'COMPARISON', 'COMPLAINT', 'RECOMMENDATION', 'NEUTRAL']
        const intentType = validIntentTypes.includes(parsed.intentType) ? parsed.intentType : 'NEUTRAL'
        const intentScore = typeof parsed.intentScore === 'number' ? Math.min(100, Math.max(0, parsed.intentScore)) : 50
        const buyingSignal = ['BUYING_SIGNAL', 'COMPARISON', 'COMPLAINT'].includes(intentType)

        return {
          intentType,
          intentScore,
          buyingSignal,
          reasoning: parsed.reasoning || 'Classification completed'
        }
      } catch (parseError) {
        console.error('[AI] Intent classification parse error:', parseError)
      }
    }

    // Fallback if parsing fails
    console.warn('[AI] Intent classification fallback - could not parse response')
    return {
      intentType: 'NEUTRAL',
      intentScore: 30,
      buyingSignal: false,
      reasoning: 'Unable to classify - defaulting to neutral'
    }
  } catch (error: any) {
    console.error('[AI] Intent classification failed:', error.message)
    return {
      intentType: 'NEUTRAL',
      intentScore: 0,
      buyingSignal: false,
      reasoning: 'Classification error: ' + error.message
    }
  }
}

// Subreddit rule type for Phase 3 integration
export interface SubredditRuleForAI {
  shortName: string
  description: string
  priority: number
}

export interface ContentGenerationOptions {
  topic: string
  subreddit: string
  tone?: 'question' | 'casual' | 'humorous' | 'informative' | 'controversial' | 'educational' | 'storytelling'
  postType?: 'text' | 'link'
  contentLength?: 'short' | 'medium' | 'long'
  variationCount?: 3 | 4 | 5 | 6
  additionalContext?: string
  subredditRules?: SubredditRuleForAI[] // Phase 3: Subreddit rules to consider
}

export async function generatePostContent(options: ContentGenerationOptions) {
  // Validate API keys first
  if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
    throw new Error('No AI service configured. Please set GEMINI_API_KEY or OPENAI_API_KEY in your environment.')
  }

  const viralBodyRules = getViralBodyPrompt()

  // Content length word counts
  const lengthConfig = {
    short: { min: 100, max: 300, description: 'short and punchy' },
    medium: { min: 300, max: 600, description: 'balanced with good detail' },
    long: { min: 600, max: 1200, description: 'in-depth and comprehensive' }
  }
  const contentLengthSetting = options.contentLength || 'medium'
  const lengthInfo = lengthConfig[contentLengthSetting]
  const numVariations = options.variationCount || 3

  // Build subreddit rules section for the prompt (Phase 3)
  const rulesSection = options.subredditRules && options.subredditRules.length > 0
    ? `
=== SUBREDDIT RULES - MUST FOLLOW ===
The following are the community guidelines for r/${options.subreddit}. Your post MUST NOT violate any of these rules:

${options.subredditRules.map((r, i) => `${i + 1}. **${r.shortName}**: ${r.description}`).join('\n')}

IMPORTANT: Before generating each post, verify it does not violate any of the above rules. If a rule prohibits self-promotion, make the post sound like genuine community discussion. If a rule requires specific formatting, follow it exactly.
`
    : ''

  const prompt = `
Generate a Reddit post for r/${options.subreddit}.

Topic: ${options.topic}
Post Type: ${options.postType || 'text'}
Tone: ${options.tone || 'casual'}
Content Length: ${contentLengthSetting.toUpperCase()} (${lengthInfo.min}-${lengthInfo.max} words - ${lengthInfo.description})
${options.additionalContext ? `Additional Context: ${options.additionalContext}` : ''}
${rulesSection}
${viralBodyRules}

Requirements:
1. Create an engaging, authentic title (max 300 characters)
2. Write compelling content that follows the VIRAL BODY COPY RULES above
3. Use proper Reddit formatting (markdown)
4. Start with an emotional hook or context-setting opener
5. Include dialogue where appropriate to make the story vivid
6. Add emotional reactions throughout the post
7. Use transformation words (but, finally, realized, then) for story arc
8. Keep paragraphs to 3-5 sentences each
9. IMPORTANT: Content must be ${lengthInfo.min}-${lengthInfo.max} words (${contentLengthSetting} length)
10. Add TL;DR at the end for posts over 300 words
11. Be natural and conversational - avoid overly promotional language
${options.subredditRules && options.subredditRules.length > 0 ? '12. CRITICAL: Ensure post complies with ALL subreddit rules listed above' : ''}

Return the response in the following JSON format:
{
  "title": "Your engaging title here",
  "content": "Your post content here with proper markdown formatting and viral structure",
  "reasoning": "Brief explanation of which viral patterns this uses"
}

Generate ${numVariations} different variations, each using different viral opening patterns.
`

  // Helper to parse AI response
  const parseResponse = (text: string) => {
    // Strip markdown code blocks if present
    let cleanText = text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .replace(/^\s*json\s*/i, '') // Handle "json" prefix without backticks
      .trim()

    // Try to parse the entire cleaned text directly
    try {
      const parsed = JSON.parse(cleanText)
      if (Array.isArray(parsed)) return parsed
      if (parsed && typeof parsed === 'object') return [parsed]
    } catch {
      // Continue to extraction methods
    }

    // Try to extract JSON array from text
    const arrayStart = cleanText.indexOf('[')
    const arrayEnd = cleanText.lastIndexOf(']')
    if (arrayStart !== -1 && arrayEnd > arrayStart) {
      try {
        const parsed = JSON.parse(cleanText.slice(arrayStart, arrayEnd + 1))
        if (Array.isArray(parsed)) return parsed
      } catch {
        // Continue to object extraction
      }
    }

    // Try to extract individual JSON objects using balanced brace matching
    const objects: any[] = []
    let depth = 0
    let start = -1
    for (let i = 0; i < cleanText.length; i++) {
      if (cleanText[i] === '{') {
        if (depth === 0) start = i
        depth++
      } else if (cleanText[i] === '}') {
        depth--
        if (depth === 0 && start !== -1) {
          try {
            const obj = JSON.parse(cleanText.slice(start, i + 1))
            if (obj.title || obj.content) objects.push(obj)
          } catch {
            // Skip malformed object
          }
          start = -1
        }
      }
    }
    if (objects.length > 0) return objects

    return parseNonJsonResponse(text)
  }

  // Try Gemini first
  if (process.env.GEMINI_API_KEY) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()
      return parseResponse(text)
    } catch (error: any) {
      // If rate limited (429) or quota exceeded, try OpenAI fallback
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        console.log('[AI] Gemini rate limited for content generation, trying OpenAI fallback...')
      } else {
        // For other Gemini errors, still try OpenAI if available
        console.error('[AI] Gemini error:', error.message)
        if (!openai) {
          throw new Error('AI service error: ' + error.message)
        }
      }
    }
  }

  // Fallback to OpenAI
  if (openai) {
    try {
      console.log('[AI] Using OpenAI for content generation...')
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096,
      })
      const text = completion.choices[0]?.message?.content || ''
      return parseResponse(text)
    } catch (error: any) {
      console.error('[AI] OpenAI error:', error.message)
      throw new Error('AI service unavailable: ' + error.message)
    }
  }

  throw new Error('No AI service available. Please configure GEMINI_API_KEY or OPENAI_API_KEY in your environment.')
}

function parseNonJsonResponse(text: string) {
  const lines = text.split('\n')
  const variations = []
  
  let currentVariation: any = {}
  let section = ''
  
  for (const line of lines) {
    if (line.includes('Title:') || line.includes('title:')) {
      if (currentVariation.title) {
        variations.push(currentVariation)
        currentVariation = {}
      }
      currentVariation.title = line.split(':').slice(1).join(':').trim()
      section = 'title'
    } else if (line.includes('Content:') || line.includes('content:')) {
      section = 'content'
      currentVariation.content = ''
    } else if (line.includes('Reasoning:') || line.includes('reasoning:')) {
      section = 'reasoning'
      currentVariation.reasoning = ''
    } else if (line.trim() && section) {
      if (section === 'content') {
        currentVariation.content = (currentVariation.content || '') + line + '\n'
      } else if (section === 'reasoning') {
        currentVariation.reasoning = (currentVariation.reasoning || '') + line + ' '
      }
    }
  }
  
  if (currentVariation.title) {
    variations.push(currentVariation)
  }
  
  return variations.length > 0 ? variations : [{
    title: 'Generated Content',
    content: text.slice(0, 500),
    reasoning: 'AI-generated content'
  }]
}

export async function analyzeSubreddit(subredditName: string) {
  const prompt = `
Analyze the subreddit r/${subredditName} and provide insights for creating content.

Provide:
1. Common post types and topics
2. Community tone and culture
3. Content dos and don'ts
4. Best practices for engagement
5. Typical post length and style

Return as JSON with these exact keys and value types:
{
  "postTypes": ["string array of post types"],
  "tone": "single string describing the tone",
  "dos": ["string array of things to do"],
  "donts": ["string array of things to avoid"],
  "bestPractices": ["string array of best practices"],
  "styleGuide": "single string with style recommendations"
}

IMPORTANT: All values must be either strings or arrays of strings. Do not use nested objects.
`

  try {
    // Use generateCompletion which has Gemini -> OpenAI fallback
    const text = await generateCompletion(prompt)

    // Clean up AI response - remove markdown code blocks and fix common issues
    let cleanText = text
      .replace(/```json\s*/gi, '')  // Remove ```json
      .replace(/```\s*/g, '')       // Remove closing ```
      .trim()

    // Extract JSON object
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      let jsonStr = jsonMatch[0]

      // Fix common JSON issues
      jsonStr = jsonStr
        .replace(/,\s*}/g, '}')     // Remove trailing commas before }
        .replace(/,\s*]/g, ']')     // Remove trailing commas before ]
        .replace(/[\x00-\x1F\x7F]/g, ' ')  // Remove control characters
        .replace(/\n/g, '\\n')      // Escape newlines in strings
        .replace(/\r/g, '')         // Remove carriage returns
        .replace(/\t/g, '\\t')      // Escape tabs

      try {
        const parsed = JSON.parse(jsonStr)

        // Validate and flatten any nested objects in styleGuide
        if (parsed.styleGuide && typeof parsed.styleGuide === 'object') {
          // Convert object to string if AI returned nested object
          parsed.styleGuide = Object.entries(parsed.styleGuide)
            .map(([key, value]) => `${key}: ${value}`)
            .join('. ')
        }

        return parsed
      } catch (parseError: any) {
        console.error('JSON parse error in analyzeSubreddit:', parseError.message)
        console.error('Attempted to parse:', jsonStr.substring(0, 500))
      }
    }

    // Fallback: return default structure if parsing fails
    console.warn('Using fallback analysis structure for r/' + subredditName)
    return {
      postTypes: ['Discussion', 'Question', 'Story'],
      tone: 'casual',
      dos: ['Be authentic', 'Provide value', 'Engage with comments'],
      donts: ['Self-promote excessively', 'Be spammy', 'Ignore community rules'],
      bestPractices: ['Read subreddit rules', 'Check top posts', 'Use proper formatting'],
      styleGuide: 'Keep it conversational and genuine'
    }
  } catch (error) {
    console.error('Subreddit analysis failed:', error)
    throw error // Throw instead of returning null so frontend can handle it
  }
}

export async function improveContent(originalContent: string, feedback: string) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const prompt = `
Improve this Reddit post based on feedback:

Original Content:
${originalContent}

Feedback:
${feedback}

Provide an improved version that addresses the feedback while maintaining the core message.
`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text()
  } catch (error) {
    console.error('Content improvement failed:', error)
    throw new Error('Failed to improve content')
  }
}

export interface ReplyGenerationOptions {
  commentContent: string
  postTitle: string
  postContent: string
  subreddit: string
  commentAuthor: string
}

export interface BusinessAnalysisResult {
  businessName: string
  businessType: string
  description: string
  targetAudience: { segment: string; description: string }[]
  painPoints: { pain: string; howToAddress: string }[]
  subreddits: { name: string; subscribers?: string; relevance: number; reason: string }[]
  keywords: string[]
}

export async function analyzeBusiness(url: string, websiteContent: string): Promise<BusinessAnalysisResult> {
  const prompt = `
Analyze this business website and provide Reddit marketing insights.

URL: ${url}
Website Content:
${websiteContent.slice(0, 8000)}

Based on this website, provide:

1. **Business Name**: The company/product name
2. **Business Type**: Category (SaaS, E-commerce, Service, etc.)
3. **Description**: 1-2 sentence summary of what they do
4. **Target Audience**: 3-4 specific audience segments with descriptions
5. **Pain Points**: 4-5 specific problems their target audience has that this product solves. For each pain point, include how to address it in Reddit comments.
6. **Recommended Subreddits**: 6-8 relevant subreddits where their target audience hangs out. Must be REAL subreddits. Include estimated subscriber count and relevance score (1-10).
7. **Keywords to Monitor**: 8-10 high-intent keywords/phrases people might search when looking for this solution

Return as JSON with this exact structure:
{
  "businessName": "string",
  "businessType": "string",
  "description": "string",
  "targetAudience": [
    {"segment": "string", "description": "string"}
  ],
  "painPoints": [
    {"pain": "string", "howToAddress": "string"}
  ],
  "subreddits": [
    {"name": "string (without r/)", "subscribers": "string like '500k'", "relevance": number, "reason": "string"}
  ],
  "keywords": ["string"]
}

Be specific and actionable. Focus on subreddits that allow self-promotion or discussion, avoid heavily moderated ones like r/technology.
`

  try {
    console.log('[AI] Starting business analysis for:', url)
    const text = await generateCompletion(prompt)
    console.log('[AI] Received AI response, length:', text.length)

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        console.log('[AI] Successfully parsed business analysis')
        return parsed
      } catch (parseError: any) {
        console.error('[AI] JSON parse error:', {
          error: parseError.message,
          responsePreview: text.slice(0, 200),
        })
        throw new Error('Unable to parse analysis results. Please try again.')
      }
    }

    console.error('[AI] No JSON found in response:', { responsePreview: text.slice(0, 200) })
    throw new Error('Unable to analyze this website. Please try a different URL.')
  } catch (error: any) {
    console.error('[AI] Business analysis failed:', {
      url,
      errorType: error.name,
      errorMessage: error.message,
    })
    // Re-throw with user-friendly message if not already formatted
    if (error.message.includes('AI service') || error.message.includes('Unable to')) {
      throw error
    }
    throw new Error('Failed to analyze business: ' + error.message)
  }
}

export async function generateReply(options: ReplyGenerationOptions) {
  const prompt = `
Generate a thoughtful, authentic reply to this Reddit comment.

Subreddit: r/${options.subreddit}
Original Post Title: ${options.postTitle}
Original Post Content: ${options.postContent.slice(0, 500)}

Comment by u/${options.commentAuthor}:
${options.commentContent}

## VIRAL REPLY CHECKLIST (Must Pass All 5):

1. IS IT TAILORED TO THE SUBREDDIT?
   - Use vocabulary and tone specific to r/${options.subreddit}
   - Reference community-specific knowledge

2. DOES IT FEEL HUMAN?
   - Write like a real person, not corporate/marketing speak
   - NO buzzwords: "leverage", "synergy", "optimize", "solution"
   - Use lowercase naturally, contractions, casual language
   - NEVER include direct links

3. IS IT WRITTEN BY A COMMUNITY MEMBER?
   - Sound like you BELONG in this community
   - Reference shared experiences and inside knowledge
   - Don't sound like an outsider or marketer

4. IS IT SKIMMABLE?
   - Keep it concise (2-4 sentences)
   - Get to the point quickly

5. WOULD YOU SHARE THIS IF SOMEONE ELSE WROTE IT?
   - Add genuine value to the discussion
   - Make it helpful, not generic

Requirements:
1. Be helpful, friendly, and authentic
2. Address the commenter's points directly
3. Match the tone of the subreddit
4. Be conversational and natural
5. Keep it concise (2-4 sentences)
6. Don't be promotional AT ALL
7. Add real value to the discussion

Return ONLY the reply text, no JSON or formatting.
`

  try {
    const text = await generateCompletion(prompt)
    return text.trim()
  } catch (error: any) {
    console.error('Reply generation failed:', error)
    throw new Error('Failed to generate reply: ' + error.message)
  }
}

export interface TopPostAnalysis {
  patterns: {
    titlePatterns: string[]
    contentPatterns: string[]
    emotionalHooks: string[]
    formatPatterns: string[]
  }
  insights: {
    avgTitleLength: number
    avgContentLength: number
    commonOpenings: string[]
    topicThemes: string[]
  }
  recommendations: string[]
}

export interface GeneratedPost {
  title: string
  content: string
  reasoning: string
  viralScore: number
}

export async function analyzeTopPostsPatterns(
  posts: { title: string; content: string | null; score: number; numComments: number }[],
  subredditName: string
): Promise<TopPostAnalysis> {
  const postsData = posts.slice(0, 15).map((p, i) =>
    `Post ${i + 1} (Score: ${p.score}, Comments: ${p.numComments}):\nTitle: ${p.title}\nContent: ${p.content?.slice(0, 500) || '[No text content]'}`
  ).join('\n\n---\n\n')

  const prompt = `
Analyze these top-performing posts from r/${subredditName} and identify what makes them successful.

${postsData}

Analyze and return JSON with this exact structure:
{
  "patterns": {
    "titlePatterns": ["pattern 1", "pattern 2", "pattern 3"],
    "contentPatterns": ["pattern 1", "pattern 2", "pattern 3"],
    "emotionalHooks": ["hook type 1", "hook type 2"],
    "formatPatterns": ["format pattern 1", "format pattern 2"]
  },
  "insights": {
    "avgTitleLength": <number>,
    "avgContentLength": <number>,
    "commonOpenings": ["opening 1", "opening 2"],
    "topicThemes": ["theme 1", "theme 2", "theme 3"]
  },
  "recommendations": ["specific recommendation 1", "specific recommendation 2", "specific recommendation 3"]
}

Focus on:
- Title structures that get high engagement (questions, numbers, emotional triggers)
- Content patterns (storytelling, formatting, length)
- Emotional hooks that resonate with this community
- Formatting patterns (paragraphs, TL;DR, bullet points)
- What topics/themes perform best
`

  try {
    const text = await generateCompletion(prompt)

    // Clean up AI response - remove markdown code blocks and fix common issues
    let cleanText = text
      .replace(/```json\s*/gi, '')  // Remove ```json
      .replace(/```\s*/g, '')       // Remove closing ```
      .trim()

    // Extract JSON object
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      let jsonStr = jsonMatch[0]

      // Fix common JSON issues
      jsonStr = jsonStr
        .replace(/,\s*}/g, '}')     // Remove trailing commas before }
        .replace(/,\s*]/g, ']')     // Remove trailing commas before ]
        .replace(/[\x00-\x1F\x7F]/g, ' ')  // Remove control characters

      try {
        return JSON.parse(jsonStr)
      } catch (parseError) {
        console.error('JSON parse error after cleanup:', parseError)
        console.error('Attempted to parse:', jsonStr.substring(0, 500))
      }
    }

    // Fallback: return default structure if parsing fails
    console.warn('Using fallback analysis structure for r/' + subredditName)
    return {
      patterns: {
        titlePatterns: ['Engaging questions', 'Personal stories', 'Numbers and specifics'],
        contentPatterns: ['Storytelling format', 'Emotional hooks', 'Clear structure'],
        emotionalHooks: ['Relatable experiences', 'Curiosity gaps', 'Surprising revelations'],
        formatPatterns: ['Short paragraphs', 'Conversational tone', 'Clear formatting']
      },
      insights: {
        avgTitleLength: 12,
        avgContentLength: 350,
        commonOpenings: ['I just...', 'So today...', 'Has anyone ever...'],
        topicThemes: ['Personal experiences', 'Questions for community', 'Shared frustrations']
      },
      recommendations: [
        'Use first-person storytelling to connect with readers',
        'Ask questions to encourage engagement',
        'Keep paragraphs short and scannable'
      ]
    }
  } catch (error: any) {
    console.error('Top posts analysis failed:', error)
    // Return fallback instead of throwing
    return {
      patterns: {
        titlePatterns: ['Engaging questions', 'Personal stories', 'Numbers and specifics'],
        contentPatterns: ['Storytelling format', 'Emotional hooks', 'Clear structure'],
        emotionalHooks: ['Relatable experiences', 'Curiosity gaps', 'Surprising revelations'],
        formatPatterns: ['Short paragraphs', 'Conversational tone', 'Clear formatting']
      },
      insights: {
        avgTitleLength: 12,
        avgContentLength: 350,
        commonOpenings: ['I just...', 'So today...', 'Has anyone ever...'],
        topicThemes: ['Personal experiences', 'Questions for community', 'Shared frustrations']
      },
      recommendations: [
        'Use first-person storytelling to connect with readers',
        'Ask questions to encourage engagement',
        'Keep paragraphs short and scannable'
      ]
    }
  }
}

export async function generatePostFromPatterns(
  analysis: TopPostAnalysis,
  userGoal: string,
  subredditName: string,
  postType: 'text' | 'link' = 'text'
): Promise<GeneratedPost[]> {
  // Get subreddit-specific viral optimization config
  const viralConfig = getSubredditViralConfig(subredditName)

  const prompt = `
You are an expert Reddit content creator. Generate posts optimized for MAXIMUM viral potential based on data from 4,944 viral Reddit posts.

=== PART 1: COMMUNITY PATTERNS (what resonates in r/${subredditName}) ===
Title Patterns: ${analysis.patterns.titlePatterns.join(', ')}
Content Patterns: ${analysis.patterns.contentPatterns.join(', ')}
Emotional Hooks: ${analysis.patterns.emotionalHooks.join(', ')}
Format Patterns: ${analysis.patterns.formatPatterns.join(', ')}
Common Openings: ${analysis.insights.commonOpenings.join(', ')}
Popular Themes: ${analysis.insights.topicThemes.join(', ')}

=== PART 2: TITLE OPTIMIZATION (data-driven rules) ===

**TITLE LENGTH & STRUCTURE:**
- Title length: AIM FOR ${viralConfig.titleLength.min}-${viralConfig.titleLength.max} words (sweet spot: ${viralConfig.titleLength.sweet} words)
- First-person pronouns ("I", "my", "me"): ${viralConfig.useFirstPerson ? 'USE THEM - adds +' + viralConfig.firstPersonBonus + ' points' : 'AVOID - this subreddit prefers third-person'}
- Question format: ${viralConfig.useQuestions ? 'Questions HELP in this subreddit' : 'AVOID questions - they score lower here'}
- Power words to USE: "finally", "realized", "but", "just", "you", "your", "actually", "never", "always"
- Transformation words: "but", "until", "then", "after", "finally" (create story arc)

**LANGUAGE:**
- Keep words SIMPLE: average 4-5 letters per word
- Use 1-2 syllable words (target: 1.6 syllables per word average)
- Use sentence case, NOT Title Case
- Avoid jargon and complex vocabulary

**PUNCTUATION:**
- Quotes in title: +15 points (include dialogue when natural)
- Ellipsis (...): +10 points (creates intrigue)
- Exclamation point: use sparingly, only for genuine excitement
- NO ALL CAPS (heavily penalized)

=== PART 3: BODY COPY OPTIMIZATION (based on 150+ viral Reddit posts) ===

${getViralBodyPrompt()}

**WORD COUNT FOR r/${subredditName}:**
${(() => {
  const counts = SUBREDDIT_WORD_COUNTS[subredditName.toLowerCase()] || { min: 200, max: 1500, sweet: 500 }
  return `Target: ${counts.min}-${counts.max} words (sweet spot: ${counts.sweet} words)`
})()}

=== PART 4: YOUR TASK ===
USER'S GOAL: ${userGoal}
POST TYPE: ${postType}

Generate 6 DIFFERENT post variations. Each must:
1. Follow the community patterns from Part 1
2. Optimize for the viral scoring rules in Part 2
3. Achieve the user's goal naturally (no obvious promotion)
4. Feel authentic to r/${subredditName}
5. Fit ONE emotional category (Aspirational, Inspirational, or Controversial)

Vary your approaches across these emotional categories:
- 2 ASPIRATIONAL posts (makes people want to level up, success stories, transformations)
- 2 INSPIRATIONAL posts (makes people want to take action, practical advice, motivation)
- 2 CONTROVERSIAL posts (hot takes, challenges conventional wisdom, sparks debate)

Also vary:
- Some with first-person storytelling
- Some with questions (if allowed)
- Some with emotional hooks
- Some with surprising revelations

Return as JSON array (6 posts):
[
  {
    "title": "Your optimized title here",
    "content": "Full post content with proper Reddit formatting",
    "reasoning": "Brief explanation of viral patterns used"
  }
]

IMPORTANT: Do NOT include viralScore in your response - we calculate it separately.
`

  try {
    const text = await generateCompletion(prompt)

    // Clean up AI response - remove markdown code blocks and fix common issues
    let cleanText = text
      .replace(/```json\s*/gi, '')  // Remove ```json
      .replace(/```\s*/g, '')       // Remove closing ```
      .trim()

    // Extract JSON array
    const jsonMatch = cleanText.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      let jsonStr = jsonMatch[0]

      // Fix common JSON issues
      jsonStr = jsonStr
        .replace(/,\s*}/g, '}')     // Remove trailing commas before }
        .replace(/,\s*]/g, ']')     // Remove trailing commas before ]
        .replace(/[\x00-\x1F\x7F]/g, ' ')  // Remove control characters

      try {
        const posts = JSON.parse(jsonStr)
        // Return all posts - the API endpoint will score and filter to top 3
        return posts.map((p: any) => ({
          title: p.title || 'Untitled Post',
          content: p.content || '',
          reasoning: p.reasoning || 'Pattern-based generation',
          viralScore: 0 // Will be calculated by API with real scoring
        }))
      } catch (parseError) {
        console.error('JSON parse error in generatePostFromPatterns:', parseError)
        console.error('Attempted to parse:', jsonStr.substring(0, 500))
      }
    }

    // Fallback: return a single generic post based on user goal
    console.warn('Using fallback post generation for r/' + subredditName)
    return [{
      title: `My experience with ${userGoal}`,
      content: `I wanted to share my thoughts on ${userGoal}.\n\nThis has been something I've been thinking about a lot lately. What are your experiences with this? Would love to hear from the community.`,
      reasoning: 'Fallback post due to AI response parsing failure',
      viralScore: 0
    }]
  } catch (error: any) {
    console.error('Post generation from patterns failed:', error)
    // Return fallback instead of throwing
    return [{
      title: `Thoughts on ${userGoal}`,
      content: `I've been exploring ${userGoal} and wanted to get the community's input.\n\nWhat has worked for you? Any tips or advice would be appreciated!`,
      reasoning: 'Fallback post due to generation error',
      viralScore: 0
    }]
  }
}

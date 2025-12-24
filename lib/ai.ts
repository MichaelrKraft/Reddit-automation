import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'
import { getViralBodyPrompt } from './viral-body-score'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

// Generic AI completion with Gemini -> OpenAI fallback
async function generateCompletion(prompt: string): Promise<string> {
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

export interface ContentGenerationOptions {
  topic: string
  subreddit: string
  tone?: 'professional' | 'casual' | 'humorous' | 'informative'
  postType?: 'text' | 'link'
  additionalContext?: string
}

export async function generatePostContent(options: ContentGenerationOptions) {
  // Validate API keys first
  if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
    throw new Error('No AI service configured. Please set GEMINI_API_KEY or OPENAI_API_KEY in your environment.')
  }

  const viralBodyRules = getViralBodyPrompt()

  const prompt = `
Generate a Reddit post for r/${options.subreddit}.

Topic: ${options.topic}
Post Type: ${options.postType || 'text'}
Tone: ${options.tone || 'casual'}
${options.additionalContext ? `Additional Context: ${options.additionalContext}` : ''}

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
9. Add TL;DR at the end for posts over 300 words
10. Be natural and conversational - avoid overly promotional language

Return the response in the following JSON format:
{
  "title": "Your engaging title here",
  "content": "Your post content here with proper markdown formatting and viral structure",
  "reasoning": "Brief explanation of which viral patterns this uses"
}

Generate 3 different variations, each using different viral opening patterns.
`

  // Helper to parse AI response
  const parseResponse = (text: string) => {
    const jsonMatch = text.match(/\{[\s\S]*\}/g)
    if (jsonMatch) {
      try {
        const variations = jsonMatch.map(json => JSON.parse(json))
        return variations
      } catch {
        return parseNonJsonResponse(text)
      }
    }
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
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const prompt = `
Analyze the subreddit r/${subredditName} and provide insights for creating content.

Provide:
1. Common post types and topics
2. Community tone and culture
3. Content dos and don'ts
4. Best practices for engagement
5. Typical post length and style

Return as JSON with keys: postTypes, tone, dos, donts, bestPractices, styleGuide
`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    
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
    return null
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

Requirements:
1. Be helpful, friendly, and authentic
2. Address the commenter's points directly
3. Match the tone of the subreddit
4. Be conversational and natural
5. Keep it concise (2-4 sentences)
6. Don't be overly promotional
7. Add value to the discussion

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

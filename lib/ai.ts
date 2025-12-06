import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export interface ContentGenerationOptions {
  topic: string
  subreddit: string
  tone?: 'professional' | 'casual' | 'humorous' | 'informative'
  postType?: 'text' | 'link'
  additionalContext?: string
}

export async function generatePostContent(options: ContentGenerationOptions) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const prompt = `
Generate a Reddit post for r/${options.subreddit}.

Topic: ${options.topic}
Post Type: ${options.postType || 'text'}
Tone: ${options.tone || 'casual'}
${options.additionalContext ? `Additional Context: ${options.additionalContext}` : ''}

Requirements:
1. Create an engaging, authentic title (max 300 characters)
2. Write compelling content that fits the subreddit's culture
3. Use proper Reddit formatting (markdown)
4. Be natural and conversational
5. Avoid overly promotional language
6. Make it valuable to the community

Return the response in the following JSON format:
{
  "title": "Your engaging title here",
  "content": "Your post content here with proper markdown formatting",
  "reasoning": "Brief explanation of why this content works for this subreddit"
}

Generate 3 different variations.
`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
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
  } catch (error: any) {
    console.error('AI generation failed:', error)
    throw new Error('Failed to generate content: ' + error.message)
  }
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

export async function generateReply(options: ReplyGenerationOptions) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

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
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    return text.trim()
  } catch (error: any) {
    console.error('Reply generation failed:', error)
    throw new Error('Failed to generate reply: ' + error.message)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

interface GeneratedComment {
  style: 'helpful' | 'curious' | 'supportive'
  text: string
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { postTitle, postUrl, subreddit, snippet } = body

    if (!postTitle || !subreddit) {
      return NextResponse.json({ error: 'Post title and subreddit are required' }, { status: 400 })
    }

    const comments = await generateCommentOptions(postTitle, subreddit, snippet)

    return NextResponse.json({ comments })
  } catch (error: any) {
    console.error('[SEO Comments] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate comments' }, { status: 500 })
  }
}

async function generateCommentOptions(
  postTitle: string,
  subreddit: string,
  snippet?: string
): Promise<GeneratedComment[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const prompt = `
You are helping a user craft a helpful comment for a Reddit thread that ranks on Google. This is an SEO opportunity - the comment should add value while potentially mentioning the user's expertise or product naturally.

Post Details:
- Subreddit: r/${subreddit}
- Title: ${postTitle}
- Context: ${snippet || '(No additional context)'}

Generate 3 distinct comment styles:
1. HELPFUL: Provide useful information, advice, or resources that directly addresses the post topic. Be genuinely helpful first.
2. CURIOUS: Ask a thoughtful follow-up question that shows expertise and engages the community.
3. SUPPORTIVE: Show empathy, share a related experience, or validate the poster's situation.

Requirements:
- Be authentic and natural (no robotic or salesy language)
- Match the subreddit's culture and tone
- Keep each comment 2-4 sentences
- Focus on adding genuine value to the discussion
- Comments should work well for someone who wants to build credibility in the community

Return ONLY valid JSON in this exact format:
[
  {"style": "helpful", "text": "Your helpful comment here"},
  {"style": "curious", "text": "Your curious/questioning comment here"},
  {"style": "supportive", "text": "Your supportive comment here"}
]
`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return parsed as GeneratedComment[]
    }

    // Fallback if JSON parsing fails
    return [
      { style: 'helpful', text: 'Great question! Based on my experience, I\'d recommend looking into a few different options depending on your specific needs.' },
      { style: 'curious', text: 'Interesting topic! What specific features or requirements are most important for your use case?' },
      { style: 'supportive', text: 'I totally understand the challenge here. Many people face the same situation - you\'re definitely not alone in this.' },
    ]
  } catch (error: any) {
    console.error('[SEO Comments] AI generation failed:', error)
    // Return fallback comments
    return [
      { style: 'helpful', text: 'Thanks for bringing this up! Here\'s what has worked well for others in similar situations.' },
      { style: 'curious', text: 'This is really relevant. Have you considered what your main priorities are?' },
      { style: 'supportive', text: 'Great post - this is something a lot of people are dealing with right now.' },
    ]
  }
}

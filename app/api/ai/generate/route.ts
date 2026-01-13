import { NextRequest, NextResponse } from 'next/server'
import { generatePostContent } from '@/lib/ai'

export async function POST(request: NextRequest) {
  let topic: string | undefined
  let subreddit: string | undefined

  try {
    const body = await request.json()
    topic = body.topic
    subreddit = body.subreddit
    const { tone, postType, contentLength, variationCount, additionalContext } = body

    if (!topic || !subreddit) {
      return NextResponse.json(
        { error: 'Topic and subreddit are required' },
        { status: 400 }
      )
    }

    const variations = await generatePostContent({
      topic,
      subreddit,
      tone,
      postType,
      contentLength,
      variationCount,
      additionalContext,
    })

    return NextResponse.json({ variations })
  } catch (error: any) {
    console.error('AI generation error:', {
      message: error.message,
      topic,
      subreddit,
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY
    })
    return NextResponse.json(
      { error: error.message || 'Failed to generate content' },
      { status: 500 }
    )
  }
}

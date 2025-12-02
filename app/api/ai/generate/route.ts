import { NextRequest, NextResponse } from 'next/server'
import { generatePostContent } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { topic, subreddit, tone, postType, additionalContext } = body
    
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
      additionalContext,
    })
    
    return NextResponse.json({ variations })
  } catch (error: any) {
    console.error('AI generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate content' },
      { status: 500 }
    )
  }
}

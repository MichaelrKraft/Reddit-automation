import { NextRequest, NextResponse } from 'next/server'
import { analyzeSubreddit } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { subreddit } = body
    
    if (!subreddit) {
      return NextResponse.json(
        { error: 'Subreddit name is required' },
        { status: 400 }
      )
    }
    
    const analysis = await analyzeSubreddit(subreddit)
    
    return NextResponse.json({ analysis })
  } catch (error: any) {
    console.error('Subreddit analysis error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to analyze subreddit' },
      { status: 500 }
    )
  }
}

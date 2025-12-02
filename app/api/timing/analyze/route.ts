import { NextRequest, NextResponse } from 'next/server'
import { timingAnalyzer } from '@/lib/timing-analyzer'

export async function POST(request: NextRequest) {
  try {
    const { subredditName, limit } = await request.json()

    if (!subredditName) {
      return NextResponse.json(
        { error: 'Subreddit name is required' },
        { status: 400 }
      )
    }

    await timingAnalyzer.analyzeSubredditActivity(
      subredditName,
      limit || 100
    )

    await timingAnalyzer.calculateOptimalTimes(subredditName, 5)

    return NextResponse.json({
      success: true,
      message: `Successfully analyzed activity patterns for r/${subredditName}`,
    })
  } catch (error: any) {
    console.error('Error analyzing timing:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to analyze timing data' },
      { status: 500 }
    )
  }
}

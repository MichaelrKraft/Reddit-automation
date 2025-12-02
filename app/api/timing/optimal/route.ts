import { NextRequest, NextResponse } from 'next/server'
import { timingAnalyzer } from '@/lib/timing-analyzer'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const subredditName = searchParams.get('subreddit')

    if (!subredditName) {
      return NextResponse.json(
        { error: 'Subreddit name is required' },
        { status: 400 }
      )
    }

    const optimalTimes = await timingAnalyzer.getOptimalTimes(subredditName)

    if (optimalTimes.length === 0) {
      return NextResponse.json({
        analyzed: false,
        message: `No timing data available for r/${subredditName}. Please analyze first.`,
        optimalTimes: [],
      })
    }

    return NextResponse.json({
      analyzed: true,
      subredditName,
      optimalTimes,
    })
  } catch (error: any) {
    console.error('Error fetching optimal times:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch optimal times' },
      { status: 500 }
    )
  }
}

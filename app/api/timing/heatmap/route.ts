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

    const heatmapData = await timingAnalyzer.getActivityHeatmap(subredditName)

    if (heatmapData.length === 0) {
      return NextResponse.json({
        analyzed: false,
        message: `No timing data available for r/${subredditName}. Please analyze first.`,
        heatmap: [],
      })
    }

    return NextResponse.json({
      analyzed: true,
      subredditName,
      heatmap: heatmapData,
    })
  } catch (error: any) {
    console.error('Error fetching heatmap:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch heatmap data' },
      { status: 500 }
    )
  }
}

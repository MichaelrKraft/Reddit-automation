import { NextRequest, NextResponse } from 'next/server'
import { getSubredditFlairs } from '@/lib/reddit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params

    if (!name) {
      return NextResponse.json(
        { error: 'Subreddit name is required' },
        { status: 400 }
      )
    }

    const flairs = await getSubredditFlairs(name)

    return NextResponse.json({
      subreddit: name,
      flairs,
      flairRequired: flairs.length > 0, // Heuristic: if flairs exist, they may be required
    })
  } catch (error: any) {
    console.error(`[Flairs API] Error fetching flairs:`, error.message)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

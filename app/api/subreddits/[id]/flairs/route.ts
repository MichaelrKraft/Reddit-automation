import { NextRequest, NextResponse } from 'next/server'
import { getSubredditFlairs } from '@/lib/reddit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Subreddit name is required' },
        { status: 400 }
      )
    }

    const flairs = await getSubredditFlairs(id)

    return NextResponse.json({
      subreddit: id,
      flairs,
      flairRequired: flairs.length > 0,
    })
  } catch (error: any) {
    console.error(`[Flairs API] Error fetching flairs:`, error.message)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

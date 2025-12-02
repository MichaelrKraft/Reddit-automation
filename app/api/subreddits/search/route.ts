import { NextRequest, NextResponse } from 'next/server'
import { searchSubreddits } from '@/lib/reddit'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, limit = 25 } = body
    
    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }
    
    const results = await searchSubreddits(query, limit)
    
    const subredditsWithSavedStatus = await Promise.all(
      results.map(async (sub: any) => {
        const existingSubreddit = await prisma.subreddit.findUnique({
          where: { name: sub.name },
        })
        
        return {
          ...sub,
          saved: !!existingSubreddit,
          id: existingSubreddit?.id,
        }
      })
    )
    
    return NextResponse.json({ subreddits: subredditsWithSavedStatus })
  } catch (error: any) {
    console.error('Subreddit search error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to search subreddits' },
      { status: 500 }
    )
  }
}

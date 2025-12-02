import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSubredditInfo } from '@/lib/reddit'

export async function GET() {
  try {
    const subreddits = await prisma.subreddit.findMany({
      orderBy: {
        subscribers: 'desc',
      },
    })
    
    return NextResponse.json({ subreddits })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, displayName, subscribers, description } = body
    
    if (!name) {
      return NextResponse.json(
        { error: 'Subreddit name is required' },
        { status: 400 }
      )
    }
    
    const existingSubreddit = await prisma.subreddit.findUnique({
      where: { name },
    })
    
    if (existingSubreddit) {
      return NextResponse.json(
        { subreddit: existingSubreddit, message: 'Subreddit already saved' },
        { status: 200 }
      )
    }
    
    let subredditData = {
      name,
      displayName: displayName || `r/${name}`,
      subscribers: subscribers || 0,
      relevance: 0.5,
    }
    
    if (!displayName || !subscribers) {
      try {
        const info = await getSubredditInfo(name)
        subredditData = {
          name: info.name,
          displayName: info.displayName,
          subscribers: info.subscribers,
          relevance: 0.5,
        }
      } catch (error) {
        console.error('Failed to fetch subreddit info:', error)
      }
    }
    
    const subreddit = await prisma.subreddit.create({
      data: subredditData,
    })
    
    return NextResponse.json({ subreddit }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

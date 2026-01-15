import { NextRequest, NextResponse } from 'next/server'
import { getSubredditRulesWithCache, SubredditRule } from '@/lib/reddit'
import { prisma } from '@/lib/prisma'

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

    // Use cached rules function (1 week cache)
    const rules = await getSubredditRulesWithCache(id, prisma)

    return NextResponse.json({
      subreddit: id,
      rules,
      rulesCount: rules.length,
      hasRules: rules.length > 0,
    })
  } catch (error: any) {
    console.error(`[Rules API] Error fetching rules for r/${(await params).id}:`, error.message)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

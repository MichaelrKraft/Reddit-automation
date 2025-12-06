import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateAnalytics } from '@/lib/spy-mode/tracker'
import { generateInsights } from '@/lib/spy-mode/insights'

// POST - Generate AI insights on-demand
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = request.headers.get('x-user-id') || 'demo-user'

    // Get account with posts
    const account = await prisma.spyAccount.findFirst({
      where: { id, userId },
      include: {
        posts: {
          orderBy: { postedAt: 'desc' },
          take: 50, // Analyze last 50 posts
        },
      },
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Convert posts to expected format
    const posts = account.posts.map(p => ({
      redditId: p.redditId,
      title: p.title,
      content: p.content,
      url: p.url,
      subreddit: p.subreddit,
      postType: p.postType as 'text' | 'link' | 'image' | 'video',
      score: p.score,
      upvoteRatio: p.upvoteRatio,
      commentCount: p.commentCount,
      awards: p.awards,
      postedAt: p.postedAt,
    }))

    // Calculate analytics
    const analytics = calculateAnalytics(posts)

    // Generate AI insights
    const insights = await generateInsights(account.username, posts, analytics)

    // Store insights in database
    await prisma.spyInsight.createMany({
      data: insights.map(i => ({
        accountId: id,
        insightType: i.insightType,
        title: i.title,
        description: i.description,
        actionItems: JSON.stringify(i.actionItems),
        confidence: i.confidence,
      })),
    })

    // Delete old insights (keep last 20)
    const allInsights = await prisma.spyInsight.findMany({
      where: { accountId: id },
      orderBy: { createdAt: 'desc' },
    })

    if (allInsights.length > 20) {
      const toDelete = allInsights.slice(20).map(i => i.id)
      await prisma.spyInsight.deleteMany({
        where: { id: { in: toDelete } },
      })
    }

    return NextResponse.json({
      insights,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error generating insights:', error)
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    )
  }
}

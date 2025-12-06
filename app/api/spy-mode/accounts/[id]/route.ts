import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateAnalytics } from '@/lib/spy-mode/tracker'

// GET - Get single account with full data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = request.headers.get('x-user-id') || 'demo-user'

    const account = await prisma.spyAccount.findFirst({
      where: { id, userId },
      include: {
        posts: {
          orderBy: { postedAt: 'desc' },
        },
        alerts: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        insights: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Calculate full analytics
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

    const analytics = calculateAnalytics(posts)

    // Get best posts (top 5 by score)
    const bestPosts = [...account.posts]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)

    // Get recent posts (last 5)
    const recentPosts = account.posts.slice(0, 5)

    return NextResponse.json({
      account: {
        id: account.id,
        username: account.username,
        displayName: account.displayName,
        avatarUrl: account.avatarUrl,
        totalKarma: account.totalKarma,
        accountAge: account.accountAge,
        isActive: account.isActive,
        notes: account.notes,
        lastChecked: account.lastChecked,
        createdAt: account.createdAt,
      },
      analytics,
      bestPosts,
      recentPosts,
      alerts: account.alerts,
      insights: account.insights.map(i => ({
        ...i,
        actionItems: JSON.parse(i.actionItems),
      })),
      totalPosts: account.posts.length,
    })
  } catch (error) {
    console.error('Error fetching spy account:', error)
    return NextResponse.json(
      { error: 'Failed to fetch account' },
      { status: 500 }
    )
  }
}

// PATCH - Update account (notes, isActive)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = request.headers.get('x-user-id') || 'demo-user'
    const { notes, isActive } = await request.json()

    // Verify ownership
    const existing = await prisma.spyAccount.findFirst({
      where: { id, userId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    const account = await prisma.spyAccount.update({
      where: { id },
      data: {
        ...(notes !== undefined && { notes }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json({ account })
  } catch (error) {
    console.error('Error updating spy account:', error)
    return NextResponse.json(
      { error: 'Failed to update account' },
      { status: 500 }
    )
  }
}

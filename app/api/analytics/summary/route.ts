import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getOrCreateUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's Reddit accounts
    const userAccounts = await prisma.redditAccount.findMany({
      where: { userId: user.id },
      select: { id: true }
    })
    const accountIds = userAccounts.map(a => a.id)

    const { searchParams } = new URL(request.url)
    const subredditName = searchParams.get('subreddit')
    const days = parseInt(searchParams.get('days') || '30')

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const whereClause: any = {
      status: 'posted',
      postedAt: { gte: startDate },
      accountId: { in: accountIds },  // Filter by user's accounts
    }
    
    if (subredditName) {
      const subreddit = await prisma.subreddit.findFirst({
        where: { name: subredditName },
      })
      if (subreddit) {
        whereClause.subredditId = subreddit.id
      }
    }
    
    const posts = await prisma.post.findMany({
      where: whereClause,
      include: {
        analytics: true,
        subreddit: true,
      },
      orderBy: { postedAt: 'desc' },
    })

    const totalPosts = posts.length
    const totalUpvotes = posts.reduce((sum, p) => sum + (p.analytics?.upvotes || 0), 0)
    const totalComments = posts.reduce((sum, p) => sum + (p.analytics?.commentCount || 0), 0)
    const totalEngagement = posts.reduce((sum, p) => sum + (p.analytics?.engagement || 0), 0)
    const avgScore = totalPosts > 0
      ? posts.reduce((sum, p) => sum + (p.analytics?.score || 0), 0) / totalPosts
      : 0
    
    const subredditStats = posts.reduce((acc: any, post) => {
      const name = post.subreddit.name
      if (!acc[name]) {
        acc[name] = {
          name,
          displayName: post.subreddit.displayName,
          posts: 0,
          upvotes: 0,
          comments: 0,
          engagement: 0,
        }
      }
      acc[name].posts++
      acc[name].upvotes += post.analytics?.upvotes || 0
      acc[name].comments += post.analytics?.commentCount || 0
      acc[name].engagement += post.analytics?.engagement || 0
      return acc
    }, {})
    
    const topSubreddits = Object.values(subredditStats)
      .sort((a: any, b: any) => b.engagement - a.engagement)
      .slice(0, 5)
    
    const topPosts = posts
      .sort((a, b) => (b.analytics?.engagement || 0) - (a.analytics?.engagement || 0))
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        title: p.title,
        subreddit: p.subreddit.displayName,
        upvotes: p.analytics?.upvotes || 0,
        comments: p.analytics?.commentCount || 0,
        score: p.analytics?.score || 0,
        url: p.url,
        postedAt: p.postedAt,
      }))
    
    const dailyStats = posts.reduce((acc: any, post) => {
      if (!post.postedAt) return acc
      const date = post.postedAt.toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = {
          date,
          posts: 0,
          upvotes: 0,
          comments: 0,
          engagement: 0,
        }
      }
      acc[date].posts++
      acc[date].upvotes += post.analytics?.upvotes || 0
      acc[date].comments += post.analytics?.commentCount || 0
      acc[date].engagement += post.analytics?.engagement || 0
      return acc
    }, {})
    
    const timeline = Object.values(dailyStats).sort((a: any, b: any) => 
      a.date.localeCompare(b.date)
    )
    
    return NextResponse.json({
      summary: {
        totalPosts,
        totalUpvotes,
        totalComments,
        totalEngagement,
        avgScore: Math.round(avgScore * 10) / 10,
      },
      topSubreddits,
      topPosts,
      timeline,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

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
    const days = parseInt(searchParams.get('days') || '30')

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const posts = await prisma.post.findMany({
      where: {
        status: 'posted',
        postedAt: { gte: startDate },
        accountId: { in: accountIds },  // Filter by user's accounts
      },
      include: {
        analytics: true,
        subreddit: true,
      },
      orderBy: { postedAt: 'desc' },
    })
    
    const csvRows = [
      [
        'Post ID',
        'Title',
        'Subreddit',
        'Posted At',
        'Upvotes',
        'Downvotes',
        'Score',
        'Comments',
        'Engagement',
        'URL',
      ].join(',')
    ]
    
    for (const post of posts) {
      const row = [
        post.id,
        `"${post.title.replace(/"/g, '""')}"`,
        post.subreddit.displayName,
        post.postedAt?.toISOString() || '',
        post.analytics?.upvotes || 0,
        post.analytics?.downvotes || 0,
        post.analytics?.score || 0,
        post.analytics?.commentCount || 0,
        post.analytics?.engagement || 0,
        post.url || '',
      ].join(',')
      csvRows.push(row)
    }
    
    const csv = csvRows.join('\n')
    
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="reddit-analytics-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

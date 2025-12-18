import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const posts = await prisma.post.findMany({
      where: {
        account: { userId: user.id },
        ...(status ? { status } : {}),
      },
      include: {
        subreddit: true,
        account: true,
        campaign: true,
        analytics: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ posts })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await request.json()
    const { title, content, subredditName, accountId, campaignId, postType = 'text', isDraft = false } = body

    if (!title || !subredditName || !accountId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify the account belongs to this user
    const account = await prisma.redditAccount.findFirst({
      where: { id: accountId, userId: user.id }
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    let subreddit = await prisma.subreddit.findUnique({
      where: { name: subredditName },
    })

    if (!subreddit) {
      subreddit = await prisma.subreddit.create({
        data: {
          name: subredditName,
          displayName: `r/${subredditName}`,
          subscribers: 0,
          relevance: 0,
        },
      })
    }

    const post = await prisma.post.create({
      data: {
        title,
        content: content || '',
        postType,
        status: isDraft ? 'draft' : 'scheduled',
        accountId,
        subredditId: subreddit.id,
        campaignId: campaignId || null,
      },
      include: {
        subreddit: true,
        account: true,
      },
    })

    return NextResponse.json({ post }, { status: 201 })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = await request.json()
    const { scheduledAt } = body

    if (!scheduledAt) {
      return NextResponse.json(
        { error: 'Missing scheduledAt field' },
        { status: 400 }
      )
    }

    // Verify the post belongs to this user
    const existingPost = await prisma.post.findFirst({
      where: {
        id,
        account: { userId: user.id },
      },
    })

    if (!existingPost) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    const post = await prisma.post.update({
      where: { id },
      data: {
        scheduledAt: new Date(scheduledAt),
        status: 'scheduled',
      },
      include: {
        subreddit: true,
      },
    })

    return NextResponse.json({ post })
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

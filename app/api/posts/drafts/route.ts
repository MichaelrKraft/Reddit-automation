import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()

    // Drafts are posts with status 'draft'
    const drafts = await prisma.post.findMany({
      where: {
        account: { userId: user.id },
        status: 'draft',
      },
      include: {
        subreddit: true,
        account: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    return NextResponse.json({ drafts })
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

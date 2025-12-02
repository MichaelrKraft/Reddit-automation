import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await requireUser()

    let account = await prisma.redditAccount.findFirst({
      where: { userId: user.id }
    })

    if (!account && process.env.REDDIT_USERNAME) {
      account = await prisma.redditAccount.create({
        data: {
          username: process.env.REDDIT_USERNAME,
          connected: true,
          karma: 0,
          userId: user.id,
        },
      })
    }

    return NextResponse.json({ account })
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

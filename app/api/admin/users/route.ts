import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'

// GET: List all users with stats (admin only)
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const tier = searchParams.get('tier')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build filter
    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { clerkId: { contains: search } }
      ]
    }
    if (tier) where.tier = tier

    // Get users with aggregated stats
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        clerkId: true,
        email: true,
        tier: true,
        plan: true,
        signupNumber: true,
        hasLifetimeDeal: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            redditAccounts: true,
            draftPosts: true,
            spyAccounts: true,
            opportunities: true,
            monitoredSubreddits: true,
            userKeywords: true
          }
        }
      },
      orderBy: { [sortBy]: sortOrder },
      take: limit,
      skip: offset
    })

    const total = await prisma.user.count({ where })

    // Get additional stats for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        // Get last activity (most recent page view or event)
        const lastPageView = await prisma.pageView.findFirst({
          where: { userId: user.clerkId },
          orderBy: { timestamp: 'desc' },
          select: { timestamp: true }
        })

        const lastEvent = await prisma.userEvent.findFirst({
          where: { userId: user.clerkId },
          orderBy: { timestamp: 'desc' },
          select: { timestamp: true }
        })

        const lastActive = lastPageView?.timestamp || lastEvent?.timestamp || null

        // Get post count
        const posts = await prisma.post.count({
          where: {
            account: {
              userId: user.id
            }
          }
        })

        return {
          ...user,
          lastActive,
          stats: {
            redditAccounts: user._count.redditAccounts,
            posts,
            drafts: user._count.draftPosts,
            spyAccounts: user._count.spyAccounts,
            opportunities: user._count.opportunities,
            monitoredSubreddits: user._count.monitoredSubreddits,
            keywords: user._count.userKeywords
          }
        }
      })
    )

    return NextResponse.json({
      users: usersWithStats,
      total,
      limit,
      offset,
      hasMore: offset + users.length < total
    })
  } catch (error) {
    console.error('[Admin Users] Error fetching users:', error)
    if (error instanceof Error && error.message.includes('Admin')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

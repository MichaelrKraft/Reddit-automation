import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'

// Engagement score calculation
function calculateEngagementScore(user: {
  redditAccountCount: number
  postCount: number
  spyAccountCount: number
  keywordCount: number
  warmupAccountCount: number
  lastActiveAt: Date | null
}): number {
  let score = 0
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Reddit accounts connected: +20 for having any
  if (user.redditAccountCount > 0) score += 20

  // Posts created: +5 each (max +30)
  score += Math.min(user.postCount * 5, 30)

  // Spy accounts: +10 each (max +20)
  score += Math.min(user.spyAccountCount * 10, 20)

  // Keywords: +5 each (max +15)
  score += Math.min(user.keywordCount * 5, 15)

  // Warmup accounts actively warming: +10 each (max +20)
  score += Math.min(user.warmupAccountCount * 10, 20)

  // Active in last 7 days: +15
  if (user.lastActiveAt && user.lastActiveAt > sevenDaysAgo) {
    score += 15
  }

  return Math.min(score, 100)
}

// GET: User engagement scoring data
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Get all users with their activity counts
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        tier: true,
        hasLifetimeDeal: true,
        createdAt: true,
        _count: {
          select: {
            redditAccounts: true,
            posts: true,
            spyAccounts: true,
            brandKeywords: true
          }
        },
        redditAccounts: {
          select: {
            warmupStatus: true
          }
        },
        events: {
          orderBy: { timestamp: 'desc' },
          take: 1,
          select: { timestamp: true }
        }
      }
    })

    // Calculate engagement scores for all users
    const usersWithScores = users.map(user => {
      const warmupCount = user.redditAccounts.filter(
        acc => !['COMPLETED', 'FAILED', 'NOT_STARTED'].includes(acc.warmupStatus)
      ).length

      const lastActivity = user.events[0]?.timestamp || null

      const score = calculateEngagementScore({
        redditAccountCount: user._count.redditAccounts,
        postCount: user._count.posts,
        spyAccountCount: user._count.spyAccounts,
        keywordCount: user._count.brandKeywords,
        warmupAccountCount: warmupCount,
        lastActiveAt: lastActivity
      })

      return {
        id: user.id,
        email: user.email,
        tier: user.tier,
        hasLifetimeDeal: user.hasLifetimeDeal,
        createdAt: user.createdAt,
        engagementScore: score,
        redditAccounts: user._count.redditAccounts,
        posts: user._count.posts,
        spyAccounts: user._count.spyAccounts,
        keywords: user._count.brandKeywords,
        lastActiveAt: lastActivity
      }
    })

    // Sort by score descending
    usersWithScores.sort((a, b) => b.engagementScore - a.engagementScore)

    // Power users: Score > 60, active in last 7 days
    const powerUsers = usersWithScores.filter(
      u => u.engagementScore > 60 && u.lastActiveAt && new Date(u.lastActiveAt) > sevenDaysAgo
    ).slice(0, 10)

    // At-risk users: Signed up 7+ days ago, score < 20, no activity
    const atRiskUsers = usersWithScores.filter(
      u => new Date(u.createdAt) < sevenDaysAgo && u.engagementScore < 20
    ).slice(0, 10)

    // Needs re-engagement: Was active 14-30 days ago, no recent activity
    const needsReengagement = usersWithScores.filter(u => {
      if (!u.lastActiveAt) return false
      const lastActive = new Date(u.lastActiveAt)
      return lastActive < fourteenDaysAgo && lastActive > thirtyDaysAgo
    }).slice(0, 10)

    // Score distribution
    const distribution = [
      { range: '0-20', count: usersWithScores.filter(u => u.engagementScore <= 20).length },
      { range: '21-40', count: usersWithScores.filter(u => u.engagementScore > 20 && u.engagementScore <= 40).length },
      { range: '41-60', count: usersWithScores.filter(u => u.engagementScore > 40 && u.engagementScore <= 60).length },
      { range: '61-80', count: usersWithScores.filter(u => u.engagementScore > 60 && u.engagementScore <= 80).length },
      { range: '81-100', count: usersWithScores.filter(u => u.engagementScore > 80).length }
    ]

    // Average score
    const avgScore = usersWithScores.length > 0
      ? Math.round(usersWithScores.reduce((sum, u) => sum + u.engagementScore, 0) / usersWithScores.length)
      : 0

    return NextResponse.json({
      summary: {
        totalUsers: usersWithScores.length,
        averageScore: avgScore,
        powerUsersCount: powerUsers.length,
        atRiskCount: atRiskUsers.length,
        needsReengagementCount: needsReengagement.length
      },
      distribution,
      powerUsers,
      atRiskUsers,
      needsReengagement,
      allUsers: usersWithScores
    })
  } catch (error) {
    console.error('[Admin Engagement] Error:', error)
    if (error instanceof Error && error.message.includes('Admin')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch engagement data' },
      { status: 500 }
    )
  }
}

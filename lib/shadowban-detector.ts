import { getRedditClient } from '@/lib/reddit'
import { prisma } from '@/lib/prisma'

export interface ShadowbanCheckResult {
  isShadowbanned: boolean
  confidence: number // 0-1
  indicators: string[]
  checkedAt: Date
}

/**
 * Check if a Reddit account is shadowbanned using multiple detection methods
 */
export async function checkShadowban(username: string): Promise<ShadowbanCheckResult> {
  const indicators: string[] = []
  let shadowbanScore = 0
  const maxScore = 5

  try {
    const reddit = await getRedditClient()

    // Method 1: Check if user profile is accessible (weight: 2)
    try {
      const user = await reddit.getUser(username).fetch()

      // If user exists, they're not shadowbanned
      if (user && user.name) {
        shadowbanScore += 0
      }
    } catch (error: any) {
      if (error.statusCode === 404 || error.message?.includes('404')) {
        indicators.push('User profile returns 404 (strong indicator)')
        shadowbanScore += 2
      }
    }

    // Method 2: Check recent posts visibility (weight: 2)
    try {
      const posts = await reddit.getUser(username).getSubmissions({ limit: 10 })

      if (posts.length === 0) {
        indicators.push('No recent posts visible')
        shadowbanScore += 0.5
      } else {
        // Check if posts have any upvotes/comments from others
        const postsWithEngagement = posts.filter((p: any) =>
          p.score > 1 || p.num_comments > 0
        )

        if (postsWithEngagement.length === 0 && posts.length > 5) {
          indicators.push('Posts exist but have zero engagement across multiple posts')
          shadowbanScore += 1.5
        }
      }
    } catch (error) {
      indicators.push('Unable to fetch user posts')
      shadowbanScore += 1
    }

    // Method 3: Check comments visibility (weight: 1)
    try {
      const comments = await reddit.getUser(username).getComments({ limit: 10 })

      if (comments.length > 0) {
        const commentsWithUpvotes = comments.filter((c: any) => c.score > 1)

        if (commentsWithUpvotes.length === 0 && comments.length > 5) {
          indicators.push('Comments have consistently low/zero scores')
          shadowbanScore += 1
        }
      }
    } catch (error) {
      // Comments check is less reliable, don't penalize heavily
      shadowbanScore += 0
    }

    // Calculate confidence (0-1)
    const confidence = shadowbanScore / maxScore
    const isShadowbanned = confidence >= 0.6 // 60% threshold

    return {
      isShadowbanned,
      confidence,
      indicators,
      checkedAt: new Date(),
    }
  } catch (error) {
    console.error('Shadowban check failed:', error)

    // If we can't check, assume not shadowbanned but low confidence
    return {
      isShadowbanned: false,
      confidence: 0,
      indicators: ['Unable to perform shadowban check'],
      checkedAt: new Date(),
    }
  }
}

/**
 * Check shadowban status for an account and update database if banned
 */
export async function checkAndUpdateShadowban(accountId: string): Promise<ShadowbanCheckResult> {
  const account = await prisma.redditAccount.findUnique({
    where: { id: accountId },
  })

  if (!account) {
    throw new Error('Account not found')
  }

  const result = await checkShadowban(account.username)

  // If shadowbanned with high confidence, mark account as failed
  if (result.isShadowbanned && result.confidence >= 0.7) {
    await prisma.redditAccount.update({
      where: { id: accountId },
      data: {
        warmupStatus: 'FAILED',
        connected: false,
      },
    })

    console.log(`🚫 Account ${account.username} marked as FAILED (shadowban detected)`)
  }

  return result
}

/**
 * Batch check shadowban status for multiple accounts
 */
export async function batchCheckShadowban(
  accountIds: string[]
): Promise<Record<string, ShadowbanCheckResult>> {
  const results: Record<string, ShadowbanCheckResult> = {}

  // Check accounts sequentially to avoid rate limiting
  for (const accountId of accountIds) {
    try {
      results[accountId] = await checkAndUpdateShadowban(accountId)

      // Delay between checks to avoid rate limiting (5 seconds)
      await new Promise((resolve) => setTimeout(resolve, 5000))
    } catch (error) {
      console.error(`Error checking shadowban for ${accountId}:`, error)
      results[accountId] = {
        isShadowbanned: false,
        confidence: 0,
        indicators: ['Check failed'],
        checkedAt: new Date(),
      }
    }
  }

  return results
}

/**
 * Get shadowban risk score based on account activity patterns
 * This is a predictive score, not a detection
 */
export function calculateShadowbanRisk(account: any): number {
  let riskScore = 0

  // Factor 1: Low karma relative to account age
  if (account.warmupStartedAt) {
    const daysSinceStart = Math.floor(
      (Date.now() - account.warmupStartedAt.getTime()) / (24 * 60 * 60 * 1000)
    )
    const expectedKarma = daysSinceStart * 3 // Expect ~3 karma/day minimum

    if (account.karma < expectedKarma * 0.3) {
      riskScore += 30 // 30% risk if very low karma
    }
  }

  // Factor 2: Account marked as inactive
  if (!account.connected) {
    riskScore += 20
  }

  // Factor 3: Already in failed status
  if (account.warmupStatus === 'FAILED') {
    riskScore += 50
  }

  // Factor 4: Check action history for suspicious patterns
  const progress = account.warmupProgress as any
  if (progress?.daily) {
    const recentDays = progress.daily.slice(-7)
    const daysWithActions = recentDays.filter((d: any) => d.actions?.length > 0).length

    if (daysWithActions < 3 && recentDays.length >= 7) {
      riskScore += 15 // Inactive for multiple days
    }
  }

  return Math.min(riskScore, 100)
}

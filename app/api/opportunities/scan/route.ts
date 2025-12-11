import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { scanSubreddit, scanAllUserSubreddits } from '@/lib/opportunity-scanner'
import { scheduleOpportunityScan } from '@/lib/queue'

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await request.json()
    const { subreddit, async: runAsync = false } = body

    // If specific subreddit provided, scan just that one
    if (subreddit) {
      // Verify user has this subreddit monitored with opportunity mining enabled
      const monitored = await prisma.monitoredSubreddit.findFirst({
        where: {
          userId: user.id,
          subreddit,
          opportunityMiningEnabled: true,
        },
      })

      if (!monitored) {
        return NextResponse.json(
          {
            error: `Subreddit r/${subreddit} is not configured for opportunity mining. ` +
                   'Enable opportunity mining in your monitored subreddits first.',
          },
          { status: 400 }
        )
      }

      if (runAsync) {
        // Queue the scan for background processing
        await scheduleOpportunityScan({
          userId: user.id,
          subreddit,
          monitoredSubredditId: monitored.id,
          limit: 50,
        })

        return NextResponse.json({
          message: `Scan queued for r/${subreddit}`,
          status: 'queued',
        })
      } else {
        // Run synchronously (for testing/debugging)
        const result = await scanSubreddit(user.id, subreddit)

        return NextResponse.json({
          message: `Scan completed for r/${subreddit}`,
          status: 'completed',
          result,
        })
      }
    }

    // No specific subreddit - scan all enabled subreddits
    const monitoredCount = await prisma.monitoredSubreddit.count({
      where: {
        userId: user.id,
        opportunityMiningEnabled: true,
        isActive: true,
      },
    })

    if (monitoredCount === 0) {
      return NextResponse.json(
        {
          error: 'No subreddits configured for opportunity mining. ' +
                 'Enable opportunity mining on at least one monitored subreddit.',
        },
        { status: 400 }
      )
    }

    if (runAsync) {
      // Queue scans for all subreddits
      const monitored = await prisma.monitoredSubreddit.findMany({
        where: {
          userId: user.id,
          opportunityMiningEnabled: true,
          isActive: true,
        },
      })

      for (let i = 0; i < monitored.length; i++) {
        await scheduleOpportunityScan(
          {
            userId: user.id,
            subreddit: monitored[i].subreddit,
            monitoredSubredditId: monitored[i].id,
            limit: 50,
          },
          i * 5000 // Stagger scans by 5 seconds
        )
      }

      return NextResponse.json({
        message: `Queued scans for ${monitored.length} subreddits`,
        status: 'queued',
        subredditsQueued: monitored.map((m) => m.subreddit),
      })
    } else {
      // Run synchronously
      const result = await scanAllUserSubreddits(user.id)

      return NextResponse.json({
        message: 'Scan completed for all subreddits',
        status: 'completed',
        result,
      })
    }
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error in opportunity scan:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET - Check scan status and history
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()

    // Get monitored subreddits with opportunity mining status
    const monitored = await prisma.monitoredSubreddit.findMany({
      where: {
        userId: user.id,
        opportunityMiningEnabled: true,
      },
      select: {
        id: true,
        subreddit: true,
        opportunityFrequency: true,
        lastOpportunityScan: true,
        isActive: true,
      },
      orderBy: { subreddit: 'asc' },
    })

    // Calculate scan recommendations
    const now = new Date()
    const subredditStatus = monitored.map((m) => {
      const lastScan = m.lastOpportunityScan
      let shouldScan = false
      let nextScanDue: Date | null = null

      if (!lastScan) {
        shouldScan = true
      } else {
        const hoursSinceLastScan = (now.getTime() - lastScan.getTime()) / (1000 * 60 * 60)

        switch (m.opportunityFrequency) {
          case 'realtime':
            shouldScan = hoursSinceLastScan >= 0.25 // 15 minutes
            nextScanDue = new Date(lastScan.getTime() + 15 * 60 * 1000)
            break
          case 'hourly':
            shouldScan = hoursSinceLastScan >= 1
            nextScanDue = new Date(lastScan.getTime() + 60 * 60 * 1000)
            break
          case 'daily':
            shouldScan = hoursSinceLastScan >= 24
            nextScanDue = new Date(lastScan.getTime() + 24 * 60 * 60 * 1000)
            break
          case 'weekly':
            shouldScan = hoursSinceLastScan >= 168 // 7 days
            nextScanDue = new Date(lastScan.getTime() + 7 * 24 * 60 * 60 * 1000)
            break
        }
      }

      return {
        subreddit: m.subreddit,
        frequency: m.opportunityFrequency,
        lastScan: m.lastOpportunityScan,
        isActive: m.isActive,
        shouldScan,
        nextScanDue,
      }
    })

    return NextResponse.json({
      subreddits: subredditStatus,
      summary: {
        total: monitored.length,
        active: monitored.filter((m) => m.isActive).length,
        needsScan: subredditStatus.filter((s) => s.shouldScan).length,
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error getting scan status:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

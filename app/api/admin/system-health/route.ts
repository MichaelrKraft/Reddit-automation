import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'
import { checkRedisConnection, getPostQueue } from '@/lib/queue'

// GET: System health status for admin dashboard
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Check database connection
    let databaseStatus = { connected: false, responseTime: 0 }
    try {
      const start = Date.now()
      await prisma.$queryRaw`SELECT 1`
      databaseStatus = {
        connected: true,
        responseTime: Date.now() - start
      }
    } catch (error) {
      databaseStatus = { connected: false, responseTime: 0 }
    }

    // Check Redis connection
    let redisStatus = { connected: false, error: undefined as string | undefined }
    try {
      redisStatus = await checkRedisConnection()
    } catch (error: any) {
      redisStatus = { connected: false, error: error.message }
    }

    // Get queue metrics
    let queueMetrics = {
      posts: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
      available: false
    }

    try {
      if (redisStatus.connected) {
        const postQueue = getPostQueue()
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          postQueue.getWaitingCount(),
          postQueue.getActiveCount(),
          postQueue.getCompletedCount(),
          postQueue.getFailedCount(),
          postQueue.getDelayedCount()
        ])
        queueMetrics = {
          posts: { waiting, active, completed, failed, delayed },
          available: true
        }
      }
    } catch (error) {
      console.error('[System Health] Queue metrics error:', error)
    }

    // Get recent errors from UserEvent
    const recentErrors = await prisma.userEvent.findMany({
      where: {
        eventType: 'error',
        timestamp: { gte: oneDayAgo }
      },
      orderBy: { timestamp: 'desc' },
      take: 20,
      select: {
        id: true,
        eventName: true,
        page: true,
        metadata: true,
        timestamp: true
      }
    })

    // Get warmup stats
    const warmupStats = await prisma.redditAccount.groupBy({
      by: ['warmupStatus'],
      _count: true
    })

    const warmupCounts: Record<string, number> = {}
    warmupStats.forEach(stat => {
      warmupCounts[stat.warmupStatus] = stat._count
    })

    // Calculate overall health status
    let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy'
    const issues: string[] = []

    if (!databaseStatus.connected) {
      overallStatus = 'critical'
      issues.push('Database connection failed')
    } else if (databaseStatus.responseTime > 1000) {
      overallStatus = 'degraded'
      issues.push('Database response slow (>1s)')
    }

    if (!redisStatus.connected) {
      overallStatus = overallStatus === 'critical' ? 'critical' : 'degraded'
      issues.push('Redis connection failed')
    }

    if (queueMetrics.posts.failed > 10) {
      overallStatus = overallStatus === 'critical' ? 'critical' : 'degraded'
      issues.push(`${queueMetrics.posts.failed} failed jobs in queue`)
    }

    if (recentErrors.length > 50) {
      overallStatus = overallStatus === 'critical' ? 'critical' : 'degraded'
      issues.push(`${recentErrors.length} errors in last 24h`)
    }

    // Get worker status (based on recent activity)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const recentPosts = await prisma.post.count({
      where: {
        postedAt: { gte: oneHourAgo }
      }
    })

    // Uptime estimate (just use server start for now)
    const uptimeMs = process.uptime() * 1000
    const uptimeHours = Math.floor(uptimeMs / (1000 * 60 * 60))
    const uptimeMins = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60))

    return NextResponse.json({
      status: overallStatus,
      issues,
      uptime: `${uptimeHours}h ${uptimeMins}m`,
      database: databaseStatus,
      redis: redisStatus,
      queues: queueMetrics,
      workers: {
        postsProcessedLastHour: recentPosts,
        warmupAccounts: warmupCounts
      },
      recentErrors: recentErrors.map(err => ({
        id: err.id,
        type: err.eventName,
        page: err.page,
        message: typeof err.metadata === 'object' && err.metadata !== null
          ? (err.metadata as Record<string, unknown>).message || 'Unknown error'
          : 'Unknown error',
        timestamp: err.timestamp
      })),
      timestamp: now.toISOString()
    })
  } catch (error) {
    console.error('[Admin System Health] Error:', error)
    if (error instanceof Error && error.message.includes('Admin')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch system health' },
      { status: 500 }
    )
  }
}

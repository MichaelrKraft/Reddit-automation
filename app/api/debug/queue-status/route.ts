import { NextResponse } from 'next/server'
import { getPostQueue, getConnection } from '@/lib/queue'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const status: any = {
    timestamp: new Date().toISOString(),
    redis: { connected: false, error: null },
    queue: { waiting: 0, delayed: 0, active: 0, completed: 0, failed: 0 },
    scheduledPosts: [],
    workerInfo: {
      instrumentationHookEnabled: true,
      redisUrlConfigured: !!process.env.REDIS_URL,
      redisUrlPrefix: process.env.REDIS_URL?.substring(0, 10) + '...',
    },
  }

  // Check Redis connection
  try {
    const connection = getConnection()
    const ping = await connection.ping()
    status.redis.connected = ping === 'PONG'
  } catch (error: any) {
    status.redis.connected = false
    status.redis.error = error.message
  }

  // Check queue status
  try {
    const queue = getPostQueue()
    const [waiting, delayed, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getDelayedCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ])
    status.queue = { waiting, delayed, active, completed, failed }

    // Get delayed jobs details
    const delayedJobs = await queue.getDelayed()
    status.delayedJobs = delayedJobs.map(job => ({
      id: job.id,
      name: job.name,
      data: job.data,
      delay: job.opts.delay,
      processAt: new Date(job.timestamp + (job.opts.delay || 0)).toISOString(),
    }))
  } catch (error: any) {
    status.queue.error = error.message
  }

  // Get scheduled posts from database
  try {
    const scheduledPosts = await prisma.post.findMany({
      where: { status: 'scheduled' },
      select: {
        id: true,
        title: true,
        scheduledAt: true,
        subreddit: { select: { name: true } },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 10,
    })
    status.scheduledPosts = scheduledPosts.map(p => ({
      id: p.id,
      title: p.title,
      scheduledAt: p.scheduledAt,
      subreddit: p.subreddit.name,
    }))
  } catch (error: any) {
    status.scheduledPosts = { error: error.message }
  }

  return NextResponse.json(status)
}

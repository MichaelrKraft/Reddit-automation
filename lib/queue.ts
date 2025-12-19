import { Queue, Worker, QueueEvents } from 'bullmq'
import IORedis from 'ioredis'
import { submitPost, PostOptions } from './reddit'
import { prisma } from './prisma'

// Lazy initialization to prevent Redis connection during build
let _connection: IORedis | null = null
let _postQueue: Queue | null = null
let _replyQueue: Queue | null = null
let _postQueueEvents: QueueEvents | null = null
let _replyQueueEvents: QueueEvents | null = null

export function getConnection(): IORedis {
  if (!_connection) {
    const redisUrl = process.env.REDIS_URL || ''
    console.log(`[Queue] Connecting to Redis: ${redisUrl.substring(0, 20)}...`)
    _connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      // Enable TLS for rediss:// URLs (Upstash)
      tls: redisUrl.startsWith('rediss://') ? {} : undefined,
      connectTimeout: 10000, // 10 second timeout
      retryStrategy: (times) => {
        if (times > 3) {
          console.error(`[Queue] Redis connection failed after ${times} attempts`)
          return null // Stop retrying
        }
        return Math.min(times * 200, 2000) // Exponential backoff
      },
    })

    _connection.on('connect', () => console.log('[Queue] Redis connected'))
    _connection.on('error', (err) => console.error('[Queue] Redis error:', err.message))
    _connection.on('close', () => console.log('[Queue] Redis connection closed'))
  }
  return _connection
}

export async function checkRedisConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    const connection = getConnection()
    const ping = await connection.ping()
    return { connected: ping === 'PONG' }
  } catch (error: any) {
    return { connected: false, error: error.message }
  }
}

export function getPostQueue(): Queue {
  if (!_postQueue) {
    _postQueue = new Queue('reddit-posts', {
      connection: getConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    })
  }
  return _postQueue
}

export interface SchedulePostData {
  postId: string
  subreddit: string
  title: string
  text?: string
  url?: string
  firstComment?: string
}

export async function schedulePost(data: SchedulePostData, scheduledAt: Date) {
  const delay = scheduledAt.getTime() - Date.now()

  console.log(`[Queue] Scheduling post ${data.postId} to r/${data.subreddit}`)
  console.log(`[Queue] Scheduled for: ${scheduledAt.toISOString()}, delay: ${delay}ms`)

  try {
    const job = await getPostQueue().add(
      'submit-post',
      data,
      {
        delay: delay > 0 ? delay : 0,
        jobId: data.postId,
      }
    )
    console.log(`[Queue] Job added successfully: ${job.id}`)
    return job
  } catch (error: any) {
    console.error(`[Queue] Failed to schedule post ${data.postId}:`, error.message)
    throw error
  }
}

export function startPostWorker() {
  const worker = new Worker(
    'reddit-posts',
    async (job) => {
      const data = job.data as SchedulePostData

      try {
        console.log(`Processing post: ${data.postId}`)

        const submission = await submitPost({
          subreddit: data.subreddit,
          title: data.title,
          text: data.text,
          url: data.url,
        })

        await prisma.post.update({
          where: { id: data.postId },
          data: {
            status: 'posted',
            postedAt: new Date(),
            redditId: submission.id,
            url: `https://reddit.com${submission.permalink}`,
          },
        })

        await prisma.postAnalytics.create({
          data: {
            postId: data.postId,
            upvotes: 0,
            downvotes: 0,
            score: 0,
            commentCount: 0,
            engagement: 0,
          },
        })

        // Auto-post first comment if provided
        if (data.firstComment) {
          try {
            console.log(`Adding first comment to post: ${data.postId}`)
            const reddit: any = await import('./reddit').then(m => m.getRedditClient())
            await submission.reply(data.firstComment)
            console.log(`First comment added successfully to post: ${data.postId}`)
          } catch (commentError: any) {
            console.error(`Failed to add first comment to post: ${data.postId}`, commentError)
            // Don't fail the whole job if comment fails - the post itself succeeded
          }
        }

        return { success: true, redditId: submission.id }
      } catch (error: any) {
        console.error(`Failed to post: ${data.postId}`, error)

        await prisma.post.update({
          where: { id: data.postId },
          data: { status: 'failed' },
        })

        throw error
      }
    },
    { connection: getConnection() }
  )
  
  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed successfully`)
  })
  
  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err)
  })
  
  return worker
}

export function getPostQueueEvents(): QueueEvents {
  if (!_postQueueEvents) {
    _postQueueEvents = new QueueEvents('reddit-posts', { connection: getConnection() })
  }
  return _postQueueEvents
}

export function getReplyQueue(): Queue {
  if (!_replyQueue) {
    _replyQueue = new Queue('reddit-replies', {
      connection: getConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    })
  }
  return _replyQueue
}

export interface ScheduleReplyData {
  commentId: string
  replyText: string
  redditCommentId: string
}

export async function scheduleReply(data: ScheduleReplyData, scheduledAt: Date) {
  const delay = scheduledAt.getTime() - Date.now()

  return await getReplyQueue().add(
    'submit-reply',
    data,
    {
      delay: delay > 0 ? delay : 0,
      jobId: data.commentId,
    }
  )
}

export function startReplyWorker() {
  const worker = new Worker(
    'reddit-replies',
    async (job) => {
      const data = job.data as ScheduleReplyData

      try {
        console.log(`Processing reply to comment: ${data.commentId}`)

        const reddit: any = await import('./reddit').then(m => m.getRedditClient())
        const redditComment = await reddit.getComment(data.redditCommentId)
        const reply = await redditComment.reply(data.replyText)

        await prisma.comment.update({
          where: { id: data.commentId },
          data: {
            replied: true,
            replyText: data.replyText,
          },
        })

        return { success: true, redditReplyId: reply.id }
      } catch (error: any) {
        console.error(`Failed to reply to comment: ${data.commentId}`, error)
        throw error
      }
    },
    { connection: getConnection() }
  )
  
  worker.on('completed', (job) => {
    console.log(`Reply job ${job.id} completed successfully`)
  })
  
  worker.on('failed', (job, err) => {
    console.error(`Reply job ${job?.id} failed:`, err)
  })
  
  return worker
}

export function getReplyQueueEvents(): QueueEvents {
  if (!_replyQueueEvents) {
    _replyQueueEvents = new QueueEvents('reddit-replies', { connection: getConnection() })
  }
  return _replyQueueEvents
}


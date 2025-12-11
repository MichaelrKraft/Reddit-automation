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
    _connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      // Enable TLS for rediss:// URLs (Upstash)
      tls: redisUrl.startsWith('rediss://') ? {} : undefined,
    })
  }
  return _connection
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
}

export async function schedulePost(data: SchedulePostData, scheduledAt: Date) {
  const delay = scheduledAt.getTime() - Date.now()

  return await getPostQueue().add(
    'submit-post',
    data,
    {
      delay: delay > 0 ? delay : 0,
      jobId: data.postId,
    }
  )
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

// ============================================
// OPPORTUNITY MINER QUEUE
// ============================================

let _opportunityQueue: Queue | null = null
let _opportunityQueueEvents: QueueEvents | null = null

export function getOpportunityQueue(): Queue {
  if (!_opportunityQueue) {
    _opportunityQueue = new Queue('opportunity-scanner', {
      connection: getConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    })
  }
  return _opportunityQueue
}

export interface OpportunityScanData {
  userId: string
  subreddit: string
  monitoredSubredditId: string
  limit?: number
}

export interface OpportunityAnalyzeData {
  userId: string
  postId: string
  postTitle: string
  postContent: string
  subreddit: string
  author: string
  score: number
  numComments: number
  createdUtc: number
  url: string
}

/**
 * Schedule a subreddit scan for opportunities
 */
export async function scheduleOpportunityScan(
  data: OpportunityScanData,
  delay: number = 0
) {
  return await getOpportunityQueue().add(
    'scan-subreddit',
    data,
    {
      delay,
      jobId: `scan-${data.monitoredSubredditId}-${Date.now()}`,
    }
  )
}

/**
 * Schedule analysis of a single post
 */
export async function schedulePostAnalysis(data: OpportunityAnalyzeData) {
  return await getOpportunityQueue().add(
    'analyze-post',
    data,
    {
      jobId: `analyze-${data.postId}`,
    }
  )
}

export function getOpportunityQueueEvents(): QueueEvents {
  if (!_opportunityQueueEvents) {
    _opportunityQueueEvents = new QueueEvents('opportunity-scanner', {
      connection: getConnection(),
    })
  }
  return _opportunityQueueEvents
}

/**
 * Start the Opportunity Scanner Worker
 * Processes scan-subreddit and analyze-post jobs
 */
export function startOpportunityWorker() {
  const worker = new Worker(
    'opportunity-scanner',
    async (job) => {
      if (job.name === 'scan-subreddit') {
        const data = job.data as OpportunityScanData
        console.log(`[OpportunityWorker] Processing scan for r/${data.subreddit}`)

        // Dynamically import to avoid circular dependencies
        const { scanSubreddit } = await import('./opportunity-scanner')
        const result = await scanSubreddit(data.userId, data.subreddit, data.limit || 50)

        // Update monitored subreddit last scan timestamp
        await prisma.monitoredSubreddit.update({
          where: { id: data.monitoredSubredditId },
          data: { lastOpportunityScan: new Date() },
        })

        return result
      } else if (job.name === 'analyze-post') {
        const data = job.data as OpportunityAnalyzeData
        console.log(`[OpportunityWorker] Analyzing post: ${data.postId}`)

        const { analyzePost } = await import('./opportunity-analyzer')

        const redditPost: any = {
          id: data.postId,
          title: data.postTitle,
          selftext: data.postContent,
          subreddit: data.subreddit,
          author: data.author,
          score: data.score,
          num_comments: data.numComments,
          created_utc: data.createdUtc,
          url: data.url,
        }

        const analysis = await analyzePost(redditPost)
        return analysis
      }

      throw new Error(`Unknown job type: ${job.name}`)
    },
    {
      connection: getConnection(),
      concurrency: 2, // Process 2 jobs at a time
    }
  )

  worker.on('completed', (job, result) => {
    console.log(`[OpportunityWorker] Job ${job.id} completed:`, result)
  })

  worker.on('failed', (job, err) => {
    console.error(`[OpportunityWorker] Job ${job?.id} failed:`, err)
  })

  return worker
}

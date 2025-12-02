import { Queue, Worker, QueueEvents } from 'bullmq'
import IORedis from 'ioredis'
import { submitPost, PostOptions } from './reddit'
import { prisma } from './prisma'

const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
})

export const postQueue = new Queue('reddit-posts', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
})

export interface SchedulePostData {
  postId: string
  subreddit: string
  title: string
  text?: string
  url?: string
}

export async function schedulePost(data: SchedulePostData, scheduledAt: Date) {
  const delay = scheduledAt.getTime() - Date.now()
  
  return await postQueue.add(
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
    { connection }
  )
  
  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed successfully`)
  })
  
  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err)
  })
  
  return worker
}

export const queueEvents = new QueueEvents('reddit-posts', { connection })

export const replyQueue = new Queue('reddit-replies', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
})

export interface ScheduleReplyData {
  commentId: string
  replyText: string
  redditCommentId: string
}

export async function scheduleReply(data: ScheduleReplyData, scheduledAt: Date) {
  const delay = scheduledAt.getTime() - Date.now()
  
  return await replyQueue.add(
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
    { connection }
  )
  
  worker.on('completed', (job) => {
    console.log(`Reply job ${job.id} completed successfully`)
  })
  
  worker.on('failed', (job, err) => {
    console.error(`Reply job ${job?.id} failed:`, err)
  })
  
  return worker
}

export const replyQueueEvents = new QueueEvents('reddit-replies', { connection })

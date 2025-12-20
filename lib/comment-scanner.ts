import { Queue, Worker } from 'bullmq'
import { getConnection } from './queue'
import { prisma } from './prisma'
import { getRedditClient } from './reddit'
import { generateReply } from './ai'

let _commentScanQueue: Queue | null = null

export function getCommentScanQueue(): Queue {
  if (!_commentScanQueue) {
    _commentScanQueue = new Queue('comment-scan', {
      connection: getConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    })
  }
  return _commentScanQueue
}

export interface ScanCommentsData {
  userId: string
  postId?: string // Optional: scan specific post, otherwise scan all recent posts
}

// Scan for new comments and generate AI replies
async function scanPostForComments(postId: string, userId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      subreddit: true,
      comments: {
        include: {
          queuedReplies: true,
        },
      },
      account: true,
    },
  })

  if (!post || !post.redditId) {
    console.log(`[CommentScanner] Post ${postId} not found or not posted yet`)
    return { newReplies: 0 }
  }

  // Verify this post belongs to the user
  if (post.account.userId !== userId) {
    console.log(`[CommentScanner] Post ${postId} doesn't belong to user ${userId}`)
    return { newReplies: 0 }
  }

  try {
    const reddit: any = getRedditClient()
    const submission = await reddit.getSubmission(post.redditId)
    const redditComments = await submission.comments.fetchAll()

    let newRepliesQueued = 0
    const existingCommentsMap = new Map(post.comments.map(c => [c.redditId, c]))

    for (const redditComment of redditComments) {
      // Skip deleted comments
      if (redditComment.author?.name === '[deleted]') continue

      // Skip if this is our own comment (the post author's reply)
      if (redditComment.author?.name === post.account.username) continue

      const existingComment = existingCommentsMap.get(redditComment.id)

      // Get or create the comment
      const savedComment = existingComment || await prisma.comment.create({
        data: {
          redditId: redditComment.id,
          postId: post.id,
          author: redditComment.author?.name || 'unknown',
          content: redditComment.body,
        },
      })

      if (!existingComment) {
        console.log(`[CommentScanner] Saved new comment ${savedComment.id}`)
      }

      // Skip if we already replied to this comment
      if (savedComment.replied) {
        console.log(`[CommentScanner] Skipping comment ${savedComment.id} - already replied`)
        continue
      }

      // Check if we already have a queued reply for this comment
      const existingQueuedReply = await prisma.queuedReply.findFirst({
        where: { commentId: savedComment.id },
      })

      if (!existingQueuedReply) {
        // Generate AI reply
        try {
          const aiReply = await generateReply({
            commentContent: savedComment.content,
            postTitle: post.title,
            postContent: post.content || '',
            subreddit: post.subreddit.name,
            commentAuthor: savedComment.author,
          })

          // Queue the reply for approval
          await prisma.queuedReply.create({
            data: {
              userId,
              commentId: savedComment.id,
              aiReplyText: aiReply,
              status: 'PENDING',
            },
          })

          newRepliesQueued++
          console.log(`[CommentScanner] Queued reply for comment ${savedComment.id} on post ${postId}`)
        } catch (error) {
          console.error(`[CommentScanner] Failed to generate AI reply for comment ${savedComment.id}:`, error)
        }
      } else {
        console.log(`[CommentScanner] Skipping comment ${savedComment.id} - already has queued reply`)
      }
    }

    return { newReplies: newRepliesQueued }
  } catch (error) {
    console.error(`[CommentScanner] Failed to scan post ${postId}:`, error)
    return { newReplies: 0 }
  }
}

// Scan all recent posts for a user
async function scanUserPosts(userId: string) {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // Get user's recent posted posts
  const userAccounts = await prisma.redditAccount.findMany({
    where: { userId },
    select: { id: true },
  })
  const accountIds = userAccounts.map(a => a.id)

  const posts = await prisma.post.findMany({
    where: {
      accountId: { in: accountIds },
      status: 'posted',
      redditId: { not: null },
      postedAt: { gte: sevenDaysAgo },
    },
    select: { id: true },
  })

  console.log(`[CommentScanner] Found ${posts.length} recent posts for user ${userId}`)

  let totalNewReplies = 0
  for (const post of posts) {
    const result = await scanPostForComments(post.id, userId)
    totalNewReplies += result.newReplies
  }

  return { totalNewReplies, postsScanned: posts.length }
}

// Schedule a scan job
export async function scheduleCommentScan(userId: string, postId?: string) {
  const queue = getCommentScanQueue()
  const jobId = postId ? `scan-${userId}-${postId}` : `scan-${userId}-all`

  // Remove existing job if rescheduling
  const existingJob = await queue.getJob(jobId)
  if (existingJob) {
    await existingJob.remove()
  }

  return await queue.add(
    'scan-comments',
    { userId, postId } as ScanCommentsData,
    { jobId }
  )
}

// Start the comment scan worker
export function startCommentScanWorker() {
  const worker = new Worker(
    'comment-scan',
    async (job) => {
      const data = job.data as ScanCommentsData
      console.log(`[CommentScanner] Starting scan for user ${data.userId}`)

      if (data.postId) {
        const result = await scanPostForComments(data.postId, data.userId)
        return { success: true, ...result }
      } else {
        const result = await scanUserPosts(data.userId)
        return { success: true, ...result }
      }
    },
    { connection: getConnection() }
  )

  worker.on('completed', (job, result) => {
    console.log(`[CommentScanner] Job ${job.id} completed:`, result)
  })

  worker.on('failed', (job, err) => {
    console.error(`[CommentScanner] Job ${job?.id} failed:`, err)
  })

  return worker
}

// Helper to manually trigger a scan (for API calls)
export async function triggerCommentScan(userId: string, postId?: string) {
  if (postId) {
    return await scanPostForComments(postId, userId)
  } else {
    return await scanUserPosts(userId)
  }
}

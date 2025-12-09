import { Worker, Job } from 'bullmq'
import { prisma } from '@/lib/prisma'
import { getRedditClient } from '@/lib/reddit'
import { generateReply, generatePostContent } from '@/lib/ai'
import { getConnection } from '@/lib/queue'

// Warm-up job data interface
interface WarmupJobData {
  accountId: string
  action: 'upvote' | 'comment' | 'post'
  targetSubreddit: string
}

// Warm-up phase configuration
const WARMUP_PHASES = {
  PHASE_1_UPVOTES: {
    days: 3,
    actions: { upvotes: 5, comments: 0, posts: 0 },
    interval: 8 * 60 * 60 * 1000, // 8 hours
  },
  PHASE_2_COMMENTS: {
    days: 4,
    actions: { upvotes: 5, comments: 2, posts: 0 },
    interval: 6 * 60 * 60 * 1000, // 6 hours
  },
  PHASE_3_POSTS: {
    days: 7,
    actions: { upvotes: 3, comments: 2, posts: 1 },
    interval: 8 * 60 * 60 * 1000, // 8 hours
  },
  PHASE_4_MIXED: {
    days: 16,
    actions: { upvotes: 4, comments: 3, posts: 1 },
    interval: 6 * 60 * 60 * 1000, // 6 hours
  },
}

// Calculate which phase an account should be in
function calculatePhase(startedAt: Date): keyof typeof WARMUP_PHASES | 'COMPLETED' {
  const daysSinceStart = Math.floor(
    (Date.now() - startedAt.getTime()) / (24 * 60 * 60 * 1000)
  )

  if (daysSinceStart < 3) return 'PHASE_1_UPVOTES'
  if (daysSinceStart < 7) return 'PHASE_2_COMMENTS'
  if (daysSinceStart < 14) return 'PHASE_3_POSTS'
  if (daysSinceStart < 30) return 'PHASE_4_MIXED'
  return 'COMPLETED'
}

// Perform upvote action
async function performUpvote(
  redditClient: any,
  accountId: string,
  subreddit: string
): Promise<void> {
  try {
    // Get hot posts from subreddit
    const posts = await redditClient
      .getSubreddit(subreddit)
      .getHot({ limit: 25 })

    if (posts.length === 0) {
      console.log(`No posts found in r/${subreddit}`)
      return
    }

    // Randomly select 5 posts to upvote
    const shuffled = posts.sort(() => 0.5 - Math.random())
    const selected = shuffled.slice(0, 5)

    for (const post of selected) {
      await post.upvote()
      console.log(`✅ Upvoted: ${post.title}`)
      // Random delay between upvotes (30-90 seconds)
      await new Promise((resolve) =>
        setTimeout(resolve, 30000 + Math.random() * 60000)
      )
    }

    // Update progress
    await updateProgress(accountId, 'upvote', selected.length)
  } catch (error) {
    console.error('Error performing upvotes:', error)
    throw error
  }
}

// Perform comment action
async function performComment(
  redditClient: any,
  accountId: string,
  subreddit: string
): Promise<void> {
  try {
    // Get hot posts from subreddit
    const posts = await redditClient
      .getSubreddit(subreddit)
      .getHot({ limit: 25 })

    if (posts.length === 0) {
      console.log(`No posts found in r/${subreddit}`)
      return
    }

    // Randomly select 2 posts to comment on
    const shuffled = posts.sort(() => 0.5 - Math.random())
    const selected = shuffled.slice(0, 2)

    for (const post of selected) {
      // Generate natural comment using AI
      const comment = await generateReply({
        commentContent: '', // For warmup, we're replying to the post itself
        postTitle: post.title,
        postContent: post.selftext || '',
        subreddit: post.subreddit?.display_name || 'general',
        commentAuthor: post.author?.name || 'anonymous',
      })

      await post.reply(comment)
      console.log(`💬 Commented on: ${post.title}`)

      // Random delay between comments (2-5 minutes)
      await new Promise((resolve) =>
        setTimeout(resolve, 120000 + Math.random() * 180000)
      )
    }

    // Update progress
    await updateProgress(accountId, 'comment', selected.length)
  } catch (error) {
    console.error('Error performing comments:', error)
    throw error
  }
}

// Perform post action
async function performPost(
  redditClient: any,
  accountId: string,
  subreddit: string
): Promise<void> {
  try {
    // Get subreddit to understand posting rules
    const subredditObj = await redditClient.getSubreddit(subreddit)

    // Generate post content using AI
    const variations = await generatePostContent({
      topic: 'general discussion',
      subreddit: subreddit,
      tone: 'casual',
    })

    // Use the first variation
    const post = Array.isArray(variations) ? variations[0] : variations
    const { title, content } = post as { title: string; content: string }

    // Submit post
    await subredditObj.submitSelfpost({
      title,
      text: content,
    })

    console.log(`📝 Posted: ${title}`)

    // Update progress
    await updateProgress(accountId, 'post', 1)
  } catch (error) {
    console.error('Error performing post:', error)
    throw error
  }
}

// Update account progress in database
async function updateProgress(
  accountId: string,
  action: 'upvote' | 'comment' | 'post',
  count: number
): Promise<void> {
  const account = await prisma.redditAccount.findUnique({
    where: { id: accountId },
  })

  if (!account) return

  // Get existing progress or initialize
  const progress = (account.warmupProgress as any) || { daily: [] }
  const today = new Date().toISOString().split('T')[0]

  // Find or create today's entry
  let todayEntry = progress.daily.find((d: any) => d.date === today)
  if (!todayEntry) {
    todayEntry = { date: today, actions: [] }
    progress.daily.push(todayEntry)
  }

  // Add action
  todayEntry.actions.push({
    type: action,
    count,
    timestamp: new Date().toISOString(),
  })

  // Update database
  await prisma.redditAccount.update({
    where: { id: accountId },
    data: { warmupProgress: progress },
  })
}

// Check if account should advance to next phase
async function checkPhaseAdvancement(accountId: string): Promise<void> {
  const account = await prisma.redditAccount.findUnique({
    where: { id: accountId },
  })

  if (!account || !account.warmupStartedAt) return

  const currentPhase = calculatePhase(account.warmupStartedAt)

  // Check if account has enough karma to complete
  if (currentPhase === 'COMPLETED' && account.karma >= 100) {
    await prisma.redditAccount.update({
      where: { id: accountId },
      data: {
        warmupStatus: 'COMPLETED',
        warmupCompletedAt: new Date(),
      },
    })
    console.log(`🎉 Account ${accountId} completed warm-up!`)
    return
  }

  // Update phase if needed
  if (account.warmupStatus !== currentPhase && currentPhase !== 'COMPLETED') {
    await prisma.redditAccount.update({
      where: { id: accountId },
      data: { warmupStatus: currentPhase },
    })
    console.log(`📈 Account ${accountId} advanced to ${currentPhase}`)
  }
}

// Warmup worker processor
async function processWarmupJob(job: Job<WarmupJobData>): Promise<void> {
  const { accountId, action, targetSubreddit } = job.data

  console.log(`🔄 Processing warmup job: ${action} for account ${accountId}`)

  try {
    // Get account details
    const account = await prisma.redditAccount.findUnique({
      where: { id: accountId },
      include: { user: true },
    })

    if (!account) {
      throw new Error(`Account ${accountId} not found`)
    }

    // Check if account is paused or failed
    if (account.warmupStatus === 'PAUSED' || account.warmupStatus === 'FAILED') {
      console.log(`⏸️  Account ${accountId} is ${account.warmupStatus}, skipping`)
      return
    }

    // Get Reddit client
    const redditClient = await getRedditClient()

    // Perform action based on type
    switch (action) {
      case 'upvote':
        await performUpvote(redditClient, accountId, targetSubreddit)
        break
      case 'comment':
        await performComment(redditClient, accountId, targetSubreddit)
        break
      case 'post':
        await performPost(redditClient, accountId, targetSubreddit)
        break
    }

    // Check if account should advance to next phase
    await checkPhaseAdvancement(accountId)

    console.log(`✅ Completed ${action} for account ${accountId}`)
  } catch (error) {
    console.error(`❌ Error processing warmup job:`, error)

    // Check if account might be shadowbanned
    if (error instanceof Error && error.message.includes('403')) {
      await prisma.redditAccount.update({
        where: { id: accountId },
        data: { warmupStatus: 'FAILED' },
      })
      console.log(`🚫 Account ${accountId} marked as FAILED (possible shadowban)`)
    }

    throw error
  }
}

// Create and export warmup worker
let warmupWorker: Worker | null = null

export function startWarmupWorker(): Worker {
  if (warmupWorker) {
    console.log('Warmup worker already running')
    return warmupWorker
  }

  warmupWorker = new Worker('warmup-jobs', processWarmupJob, {
    connection: getConnection(),
    concurrency: 5, // Process up to 5 accounts simultaneously
    limiter: {
      max: 10, // Max 10 jobs
      duration: 60000, // per minute (Reddit API limit is 60/min)
    },
  })

  warmupWorker.on('completed', (job) => {
    console.log(`✅ Warmup job ${job.id} completed`)
  })

  warmupWorker.on('failed', (job, err) => {
    console.error(`❌ Warmup job ${job?.id} failed:`, err.message)
  })

  warmupWorker.on('error', (err) => {
    console.error('❌ Warmup worker error:', err)
  })

  console.log('🚀 Warmup worker started')
  return warmupWorker
}

export function stopWarmupWorker(): void {
  if (warmupWorker) {
    warmupWorker.close()
    warmupWorker = null
    console.log('🛑 Warmup worker stopped')
  }
}

export { WARMUP_PHASES, calculatePhase }

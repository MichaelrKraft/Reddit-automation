import { Queue } from 'bullmq'
import { prisma } from '@/lib/prisma'
import { getConnection } from '@/lib/queue'
import { WARMUP_PHASES, calculatePhase } from '@/lib/warmup-worker'

// Helper to get today's date string in YYYY-MM-DD format
function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0]
}

// Helper to count today's actions from warmup progress
function getTodayActionCounts(warmupProgress: any): { upvotes: number; comments: number; posts: number } {
  const counts = { upvotes: 0, comments: 0, posts: 0 }

  if (!warmupProgress?.daily) return counts

  const today = getTodayDateString()
  const todayEntry = warmupProgress.daily.find((d: any) => d.date === today)

  if (!todayEntry?.actions) return counts

  for (const action of todayEntry.actions) {
    if (action.type === 'upvote') counts.upvotes += action.count || 1
    if (action.type === 'comment') counts.comments += action.count || 1
    if (action.type === 'post') counts.posts += action.count || 1
  }

  return counts
}

// Warmup orchestrator for coordinating multiple Reddit accounts
class WarmupOrchestrator {
  private warmupQueue: Queue
  private schedulerInterval: NodeJS.Timeout | null = null
  private isRunning = false

  constructor() {
    this.warmupQueue = new Queue('warmup-jobs', {
      connection: getConnection(),
    })
  }

  // Start the orchestrator
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Warmup orchestrator already running')
      return
    }

    this.isRunning = true
    console.log('🚀 Starting warmup orchestrator...')

    // Schedule jobs immediately on start
    await this.scheduleWarmupJobs()

    // Schedule jobs every 6 hours (minimum interval across all phases)
    this.schedulerInterval = setInterval(async () => {
      await this.scheduleWarmupJobs()
    }, 6 * 60 * 60 * 1000)

    console.log('✅ Warmup orchestrator started')
  }

  // Stop the orchestrator
  stop(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval)
      this.schedulerInterval = null
    }
    this.isRunning = false
    console.log('🛑 Warmup orchestrator stopped')
  }

  // Schedule warmup jobs for all active accounts
  async scheduleWarmupJobs(): Promise<void> {
    try {
      console.log('📅 Scheduling warmup jobs...')

      // Get all active warmup accounts
      const accounts = await prisma.redditAccount.findMany({
        where: {
          isWarmupAccount: true,
          warmupStatus: {
            notIn: ['COMPLETED', 'FAILED', 'PAUSED'],
          },
        },
      })

      if (accounts.length === 0) {
        console.log('No active warmup accounts found')
        return
      }

      console.log(`Found ${accounts.length} active warmup accounts`)

      // Schedule jobs for each account
      for (const account of accounts) {
        await this.scheduleAccountJobs(account)
      }

      console.log('✅ Warmup jobs scheduled')
    } catch (error) {
      console.error('Error scheduling warmup jobs:', error)
    }
  }

  // Schedule jobs for a specific account based on its phase
  private async scheduleAccountJobs(account: any): Promise<void> {
    try {
      // Start warmup if not started
      if (account.warmupStatus === 'NOT_STARTED') {
        await prisma.redditAccount.update({
          where: { id: account.id },
          data: {
            warmupStatus: 'PHASE_1_UPVOTES',
            warmupStartedAt: new Date(),
          },
        })
        account.warmupStatus = 'PHASE_1_UPVOTES'
        account.warmupStartedAt = new Date()
      }

      // Calculate current phase
      const calculatedPhase = calculatePhase(account.warmupStartedAt)

      // Update phase if needed
      if (calculatedPhase !== account.warmupStatus && calculatedPhase !== 'COMPLETED') {
        await prisma.redditAccount.update({
          where: { id: account.id },
          data: { warmupStatus: calculatedPhase },
        })
        account.warmupStatus = calculatedPhase
      }

      // Skip if completed
      if (calculatedPhase === 'COMPLETED') {
        await prisma.redditAccount.update({
          where: { id: account.id },
          data: {
            warmupStatus: 'COMPLETED',
            warmupCompletedAt: new Date(),
          },
        })
        return
      }

      // Get phase configuration
      const phaseConfig = WARMUP_PHASES[account.warmupStatus as keyof typeof WARMUP_PHASES]
      if (!phaseConfig) return

      // FIX #1: Check daily limits before scheduling
      const todayActions = getTodayActionCounts(account.warmupProgress)
      const today = getTodayDateString()

      // Calculate remaining actions allowed today
      const remainingUpvotes = Math.max(0, phaseConfig.actions.upvotes - todayActions.upvotes)
      const remainingComments = Math.max(0, phaseConfig.actions.comments - todayActions.comments)
      const remainingPosts = Math.max(0, phaseConfig.actions.posts - todayActions.posts)

      // Log limit status
      if (remainingUpvotes === 0 && remainingComments === 0 && remainingPosts === 0) {
        console.log(`⏳ Account ${account.username} has reached daily limits, skipping scheduling`)
        return
      }

      // FIX #2: Use jobId for deduplication - jobs with same ID won't be duplicated
      // Schedule upvote jobs (only if under daily limit)
      if (remainingUpvotes > 0) {
        const jobId = `upvote-${account.id}-${today}`
        const existingJob = await this.warmupQueue.getJob(jobId)

        if (!existingJob) {
          await this.warmupQueue.add(
            'upvote',
            {
              accountId: account.id,
              action: 'upvote',
              targetSubreddit: 'CasualConversation',
            },
            {
              jobId, // Prevents duplicate jobs for same account on same day
              delay: this.getRandomDelay(0, 30 * 60 * 1000),
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 5000,
              },
            }
          )
          console.log(`  📤 Scheduled upvote job (${remainingUpvotes} remaining today)`)
        } else {
          console.log(`  ⏭️  Upvote job already exists for ${account.username} today`)
        }
      }

      // Schedule comment jobs (only if under daily limit)
      if (remainingComments > 0) {
        const jobId = `comment-${account.id}-${today}`
        const existingJob = await this.warmupQueue.getJob(jobId)

        if (!existingJob) {
          await this.warmupQueue.add(
            'comment',
            {
              accountId: account.id,
              action: 'comment',
              targetSubreddit: 'CasualConversation',
            },
            {
              jobId,
              delay: this.getRandomDelay(30 * 60 * 1000, 2 * 60 * 60 * 1000),
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 5000,
              },
            }
          )
          console.log(`  💬 Scheduled comment job (${remainingComments} remaining today)`)
        } else {
          console.log(`  ⏭️  Comment job already exists for ${account.username} today`)
        }
      }

      // Schedule post jobs (only if under daily limit)
      if (remainingPosts > 0) {
        const jobId = `post-${account.id}-${today}`
        const existingJob = await this.warmupQueue.getJob(jobId)

        if (!existingJob) {
          await this.warmupQueue.add(
            'post',
            {
              accountId: account.id,
              action: 'post',
              targetSubreddit: 'CasualConversation',
            },
            {
              jobId,
              delay: this.getRandomDelay(2 * 60 * 60 * 1000, 4 * 60 * 60 * 1000),
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 5000,
              },
            }
          )
          console.log(`  📝 Scheduled post job (${remainingPosts} remaining today)`)
        } else {
          console.log(`  ⏭️  Post job already exists for ${account.username} today`)
        }
      }

      console.log(`📋 Scheduled jobs for account ${account.username} (${account.warmupStatus})`)
    } catch (error) {
      console.error(`Error scheduling jobs for account ${account.id}:`, error)
    }
  }

  // Get random delay to avoid patterns
  private getRandomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  // Start warmup for a specific account
  async startAccountWarmup(accountId: string): Promise<void> {
    const account = await prisma.redditAccount.findUnique({
      where: { id: accountId },
    })

    if (!account) {
      throw new Error('Account not found')
    }

    // Mark as warmup account and start
    await prisma.redditAccount.update({
      where: { id: accountId },
      data: {
        isWarmupAccount: true,
        warmupStatus: 'PHASE_1_UPVOTES',
        warmupStartedAt: new Date(),
      },
    })

    // Schedule initial jobs
    await this.scheduleAccountJobs({
      ...account,
      isWarmupAccount: true,
      warmupStatus: 'PHASE_1_UPVOTES',
      warmupStartedAt: new Date(),
    })

    console.log(`✅ Started warmup for account ${account.username}`)
  }

  // Pause warmup for a specific account
  async pauseAccountWarmup(accountId: string): Promise<void> {
    await prisma.redditAccount.update({
      where: { id: accountId },
      data: { warmupStatus: 'PAUSED' },
    })

    // Remove pending jobs for this account
    const jobs = await this.warmupQueue.getJobs(['waiting', 'delayed'])
    for (const job of jobs) {
      if (job.data.accountId === accountId) {
        await job.remove()
      }
    }

    console.log(`⏸️  Paused warmup for account ${accountId}`)
  }

  // Resume warmup for a specific account
  async resumeAccountWarmup(accountId: string): Promise<void> {
    const account = await prisma.redditAccount.findUnique({
      where: { id: accountId },
    })

    if (!account || !account.warmupStartedAt) {
      throw new Error('Account not found or warmup not started')
    }

    // Calculate current phase and resume
    const phase = calculatePhase(account.warmupStartedAt)

    if (phase === 'COMPLETED') {
      await prisma.redditAccount.update({
        where: { id: accountId },
        data: {
          warmupStatus: 'COMPLETED',
          warmupCompletedAt: new Date(),
        },
      })
      return
    }

    await prisma.redditAccount.update({
      where: { id: accountId },
      data: { warmupStatus: phase as any },
    })

    // Schedule jobs
    await this.scheduleAccountJobs({
      ...account,
      warmupStatus: phase,
    })

    console.log(`▶️  Resumed warmup for account ${account.username}`)
  }

  // Stop warmup for a specific account
  async stopAccountWarmup(accountId: string): Promise<void> {
    await prisma.redditAccount.update({
      where: { id: accountId },
      data: {
        isWarmupAccount: false,
        warmupStatus: 'NOT_STARTED',
      },
    })

    // Remove pending jobs
    const jobs = await this.warmupQueue.getJobs(['waiting', 'delayed'])
    for (const job of jobs) {
      if (job.data.accountId === accountId) {
        await job.remove()
      }
    }

    console.log(`🛑 Stopped warmup for account ${accountId}`)
  }

  // Get warmup statistics
  async getWarmupStats(): Promise<any> {
    const accounts = await prisma.redditAccount.findMany({
      where: { isWarmupAccount: true },
    })

    const stats = {
      total: accounts.length,
      byStatus: {} as Record<string, number>,
      activeJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
    }

    // Count by status
    for (const account of accounts) {
      const status = account.warmupStatus
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1
    }

    // Get job counts
    const jobCounts = await this.warmupQueue.getJobCounts()
    stats.activeJobs = jobCounts.active + jobCounts.waiting + jobCounts.delayed
    stats.completedJobs = jobCounts.completed
    stats.failedJobs = jobCounts.failed

    return stats
  }
}

// Singleton instance
let orchestrator: WarmupOrchestrator | null = null

export function getWarmupOrchestrator(): WarmupOrchestrator {
  if (!orchestrator) {
    orchestrator = new WarmupOrchestrator()
  }
  return orchestrator
}

export function initializeWarmupOrchestrator(): void {
  const orch = getWarmupOrchestrator()
  orch.start()
}

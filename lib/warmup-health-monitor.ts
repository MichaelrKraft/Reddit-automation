import { prisma } from '@/lib/prisma'
import { Queue } from 'bullmq'
import { getConnection } from '@/lib/queue'

// Health status types
export type HealthStatus = 'healthy' | 'degraded' | 'critical'

export interface SystemHealth {
  status: HealthStatus
  timestamp: Date
  checks: {
    database: HealthCheck
    redis: HealthCheck
    workers: HealthCheck
    accounts: HealthCheck
  }
  metrics: {
    activeAccounts: number
    completedAccounts: number
    failedAccounts: number
    avgCompletionTime: number | null
    jobSuccessRate: number
  }
  alerts: Alert[]
}

interface HealthCheck {
  status: HealthStatus
  message: string
  details?: any
}

interface Alert {
  severity: 'warning' | 'error' | 'critical'
  message: string
  timestamp: Date
  accountId?: string
}

class WarmupHealthMonitor {
  private warmupQueue: Queue
  private alerts: Alert[] = []

  constructor() {
    this.warmupQueue = new Queue('warmup-jobs', {
      connection: getConnection(),
    })
  }

  // Perform comprehensive health check
  async performHealthCheck(): Promise<SystemHealth> {
    const timestamp = new Date()
    const checks = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      workers: await this.checkWorkers(),
      accounts: await this.checkAccounts(),
    }

    const metrics = await this.getMetrics()
    const overallStatus = this.determineOverallStatus(checks)

    // Clear old alerts (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    this.alerts = this.alerts.filter((a) => a.timestamp > oneHourAgo)

    return {
      status: overallStatus,
      timestamp,
      checks,
      metrics,
      alerts: this.alerts,
    }
  }

  // Check database connectivity and health
  private async checkDatabase(): Promise<HealthCheck> {
    try {
      // Test database connection
      await prisma.$queryRaw`SELECT 1`

      // Check for stuck warmup accounts
      const stuckAccounts = await prisma.redditAccount.count({
        where: {
          isWarmupAccount: true,
          warmupStatus: {
            notIn: ['COMPLETED', 'FAILED'],
          },
          warmupStartedAt: {
            lt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35+ days
          },
        },
      })

      if (stuckAccounts > 0) {
        this.addAlert({
          severity: 'warning',
          message: `${stuckAccounts} account(s) stuck in warmup for 35+ days`,
          timestamp: new Date(),
        })

        return {
          status: 'degraded',
          message: `Database healthy, but ${stuckAccounts} stuck accounts detected`,
          details: { stuckAccounts },
        }
      }

      return {
        status: 'healthy',
        message: 'Database connection healthy',
      }
    } catch (error) {
      this.addAlert({
        severity: 'critical',
        message: 'Database connection failed',
        timestamp: new Date(),
      })

      return {
        status: 'critical',
        message: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // Check Redis connectivity and queue health
  private async checkRedis(): Promise<HealthCheck> {
    try {
      // Test Redis connection via queue
      const client = await this.warmupQueue.client
      await client.ping()

      // Check for excessive failed jobs
      const jobCounts = await this.warmupQueue.getJobCounts()
      const failureRate =
        jobCounts.failed / (jobCounts.completed + jobCounts.failed || 1)

      if (failureRate > 0.3) {
        // >30% failure rate
        this.addAlert({
          severity: 'error',
          message: `High job failure rate: ${(failureRate * 100).toFixed(1)}%`,
          timestamp: new Date(),
        })

        return {
          status: 'degraded',
          message: 'Redis healthy but high job failure rate',
          details: { failureRate, jobCounts },
        }
      }

      return {
        status: 'healthy',
        message: 'Redis connection healthy',
        details: { jobCounts },
      }
    } catch (error) {
      this.addAlert({
        severity: 'critical',
        message: 'Redis connection failed',
        timestamp: new Date(),
      })

      return {
        status: 'critical',
        message: 'Redis connection failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // Check worker health
  private async checkWorkers(): Promise<HealthCheck> {
    try {
      const jobCounts = await this.warmupQueue.getJobCounts()

      // Check for stuck jobs
      const stuckJobs = await this.warmupQueue.getJobs(['active'], 0, 100)
      const now = Date.now()
      const stuckThreshold = 30 * 60 * 1000 // 30 minutes

      const actuallyStuck = stuckJobs.filter((job) => {
        const processedOn = job.processedOn || 0
        return now - processedOn > stuckThreshold
      })

      if (actuallyStuck.length > 0) {
        this.addAlert({
          severity: 'error',
          message: `${actuallyStuck.length} job(s) stuck for 30+ minutes`,
          timestamp: new Date(),
        })

        return {
          status: 'degraded',
          message: 'Workers running but some jobs are stuck',
          details: { stuckJobs: actuallyStuck.length },
        }
      }

      return {
        status: 'healthy',
        message: 'Workers processing jobs normally',
        details: jobCounts,
      }
    } catch (error) {
      this.addAlert({
        severity: 'critical',
        message: 'Worker health check failed',
        timestamp: new Date(),
      })

      return {
        status: 'critical',
        message: 'Worker health check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // Check account health
  private async checkAccounts(): Promise<HealthCheck> {
    try {
      const accounts = await prisma.redditAccount.findMany({
        where: { isWarmupAccount: true },
      })

      const failedAccounts = accounts.filter((a) => a.warmupStatus === 'FAILED')
      const failureRate = failedAccounts.length / (accounts.length || 1)

      // Check for high failure rate
      if (failureRate > 0.2) {
        // >20% failure rate
        this.addAlert({
          severity: 'warning',
          message: `High account failure rate: ${(failureRate * 100).toFixed(1)}%`,
          timestamp: new Date(),
        })

        return {
          status: 'degraded',
          message: 'High account failure rate detected',
          details: {
            total: accounts.length,
            failed: failedAccounts.length,
            failureRate,
          },
        }
      }

      // Check for accounts with low karma after significant time
      const lowKarmaAccounts = accounts.filter((a) => {
        if (!a.warmupStartedAt) return false
        const daysSinceStart = Math.floor(
          (Date.now() - a.warmupStartedAt.getTime()) / (24 * 60 * 60 * 1000)
        )
        return daysSinceStart > 14 && a.karma < 20
      })

      if (lowKarmaAccounts.length > 0) {
        this.addAlert({
          severity: 'warning',
          message: `${lowKarmaAccounts.length} account(s) with low karma after 14+ days`,
          timestamp: new Date(),
        })
      }

      return {
        status: 'healthy',
        message: 'Account health within normal parameters',
        details: {
          total: accounts.length,
          failed: failedAccounts.length,
          lowKarma: lowKarmaAccounts.length,
        },
      }
    } catch (error) {
      this.addAlert({
        severity: 'error',
        message: 'Account health check failed',
        timestamp: new Date(),
      })

      return {
        status: 'degraded',
        message: 'Account health check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // Get metrics
  private async getMetrics(): Promise<SystemHealth['metrics']> {
    try {
      const accounts = await prisma.redditAccount.findMany({
        where: { isWarmupAccount: true },
      })

      const activeAccounts = accounts.filter(
        (a) =>
          a.warmupStatus !== 'COMPLETED' &&
          a.warmupStatus !== 'FAILED' &&
          a.warmupStatus !== 'PAUSED'
      ).length

      const completedAccounts = accounts.filter(
        (a) => a.warmupStatus === 'COMPLETED'
      ).length

      const failedAccounts = accounts.filter(
        (a) => a.warmupStatus === 'FAILED'
      ).length

      // Calculate average completion time
      const completedWithTimes = accounts.filter(
        (a) => a.warmupCompletedAt && a.warmupStartedAt
      )

      const avgCompletionTime =
        completedWithTimes.length > 0
          ? completedWithTimes.reduce((sum, a) => {
              const duration =
                a.warmupCompletedAt!.getTime() - a.warmupStartedAt!.getTime()
              return sum + duration
            }, 0) / completedWithTimes.length
          : null

      // Get job success rate
      const jobCounts = await this.warmupQueue.getJobCounts()
      const total = jobCounts.completed + jobCounts.failed
      const jobSuccessRate = total > 0 ? jobCounts.completed / total : 1

      return {
        activeAccounts,
        completedAccounts,
        failedAccounts,
        avgCompletionTime,
        jobSuccessRate,
      }
    } catch (error) {
      console.error('Error getting metrics:', error)
      return {
        activeAccounts: 0,
        completedAccounts: 0,
        failedAccounts: 0,
        avgCompletionTime: null,
        jobSuccessRate: 0,
      }
    }
  }

  // Determine overall system status
  private determineOverallStatus(checks: SystemHealth['checks']): HealthStatus {
    const statuses = Object.values(checks).map((c) => c.status)

    if (statuses.includes('critical')) return 'critical'
    if (statuses.includes('degraded')) return 'degraded'
    return 'healthy'
  }

  // Add alert
  private addAlert(alert: Alert): void {
    // Prevent duplicate alerts within 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const duplicate = this.alerts.find(
      (a) =>
        a.message === alert.message &&
        a.timestamp > fiveMinutesAgo &&
        a.accountId === alert.accountId
    )

    if (!duplicate) {
      this.alerts.push(alert)
      console.log(`🚨 [${alert.severity.toUpperCase()}] ${alert.message}`)
    }
  }

  // Get current alerts
  getAlerts(): Alert[] {
    return this.alerts
  }

  // Clear alerts
  clearAlerts(): void {
    this.alerts = []
  }
}

// Singleton instance
let healthMonitor: WarmupHealthMonitor | null = null

export function getHealthMonitor(): WarmupHealthMonitor {
  if (!healthMonitor) {
    healthMonitor = new WarmupHealthMonitor()
  }
  return healthMonitor
}

// Export for testing
export { WarmupHealthMonitor }

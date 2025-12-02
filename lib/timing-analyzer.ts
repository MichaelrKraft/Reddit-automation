import { getRedditClient } from './reddit'
import { prisma } from './prisma'

interface PostTimingData {
  subreddit: string
  postedAt: Date
  score: number
  numComments: number
  upvoteRatio: number
}

export class TimingAnalyzer {
  private redditClient: any = null

  // Lazy initialization - only create Reddit client when actually needed
  private getClient(): any {
    if (!this.redditClient) {
      this.redditClient = getRedditClient()
    }
    return this.redditClient
  }

  async analyzeSubredditActivity(subredditName: string, limit: number = 100): Promise<void> {
    console.log(`📊 Analyzing activity patterns for r/${subredditName}...`)

    try {
      const subreddit = await this.getClient().getSubreddit(subredditName)
      const hotPosts = await subreddit.getHot({ limit })
      const newPosts = await subreddit.getNew({ limit })
      const topPosts = await subreddit.getTop({ time: 'week', limit })

      const allPosts = [...hotPosts, ...newPosts, ...topPosts]
      
      const timingData: PostTimingData[] = []

      for (const post of allPosts) {
        const postedAt = new Date(post.created_utc * 1000)
        
        timingData.push({
          subreddit: subredditName,
          postedAt,
          score: post.score || 0,
          numComments: post.num_comments || 0,
          upvoteRatio: post.upvote_ratio || 0,
        })
      }

      await this.processTimingData(timingData)

      console.log(`✅ Analyzed ${timingData.length} posts from r/${subredditName}`)
    } catch (error) {
      console.error(`❌ Error analyzing r/${subredditName}:`, error)
      throw error
    }
  }

  private async processTimingData(data: PostTimingData[]): Promise<void> {
    const activityMap = new Map<string, {
      scores: number[]
      comments: number[]
      ratios: number[]
      count: number
    }>()

    for (const post of data) {
      // Convert UTC to Mountain Time (UTC-7 for MST, UTC-6 for MDT)
      const mtTime = this.convertToMountainTime(post.postedAt)
      const dayOfWeek = mtTime.getDay()
      const hourOfDay = mtTime.getHours()
      const key = `${post.subreddit}-${dayOfWeek}-${hourOfDay}`

      if (!activityMap.has(key)) {
        activityMap.set(key, {
          scores: [],
          comments: [],
          ratios: [],
          count: 0,
        })
      }

      const activity = activityMap.get(key)!
      activity.scores.push(post.score)
      activity.comments.push(post.numComments)
      activity.ratios.push(post.upvoteRatio)
      activity.count++
    }

    for (const [key, activity] of activityMap.entries()) {
      const [subreddit, dayOfWeek, hourOfDay] = key.split('-')
      
      const avgScore = activity.scores.reduce((a, b) => a + b, 0) / activity.scores.length
      const avgComments = activity.comments.reduce((a, b) => a + b, 0) / activity.comments.length
      const avgRatio = activity.ratios.reduce((a, b) => a + b, 0) / activity.ratios.length
      
      const engagementRate = (avgScore * 0.6) + (avgComments * 0.3) + (avgRatio * 100 * 0.1)

      await prisma.subredditActivity.upsert({
        where: {
          subredditName_dayOfWeek_hourOfDay: {
            subredditName: subreddit,
            dayOfWeek: parseInt(dayOfWeek),
            hourOfDay: parseInt(hourOfDay),
          },
        },
        update: {
          avgScore,
          avgComments,
          postCount: activity.count,
          engagementRate,
          sampleSize: activity.count,
          lastAnalyzed: new Date(),
        },
        create: {
          subredditName: subreddit,
          dayOfWeek: parseInt(dayOfWeek),
          hourOfDay: parseInt(hourOfDay),
          avgScore,
          avgComments,
          postCount: activity.count,
          engagementRate,
          sampleSize: activity.count,
        },
      })
    }
  }

  async calculateOptimalTimes(subredditName: string, topN: number = 5): Promise<void> {
    console.log(`🎯 Calculating optimal posting times for r/${subredditName}...`)

    const activities = await prisma.subredditActivity.findMany({
      where: { subredditName },
      orderBy: { engagementRate: 'desc' },
      take: topN,
    })

    if (activities.length === 0) {
      console.log(`⚠️  No activity data found for r/${subredditName}. Run analysis first.`)
      return
    }

    await prisma.optimalTimeRecommendation.deleteMany({
      where: { subredditName },
    })

    const maxEngagement = activities[0].engagementRate
    
    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i]
      const confidenceScore = activity.engagementRate / maxEngagement
      
      await prisma.optimalTimeRecommendation.create({
        data: {
          subredditName,
          dayOfWeek: activity.dayOfWeek,
          hourOfDay: activity.hourOfDay,
          confidenceScore,
          avgEngagement: activity.engagementRate,
          rank: i + 1,
        },
      })
    }

    console.log(`✅ Calculated top ${activities.length} optimal times for r/${subredditName}`)
  }

  async getOptimalTimes(subredditName: string): Promise<any[]> {
    const recommendations = await prisma.optimalTimeRecommendation.findMany({
      where: { subredditName },
      orderBy: { rank: 'asc' },
    })

    return recommendations.map((rec) => {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const timeStr = `${rec.hourOfDay.toString().padStart(2, '0')}:00`
      
      return {
        rank: rec.rank,
        dayOfWeek: dayNames[rec.dayOfWeek],
        hourOfDay: rec.hourOfDay,
        timeString: timeStr,
        confidenceScore: rec.confidenceScore,
        avgEngagement: rec.avgEngagement,
        recommendedTime: this.getNextOccurrence(rec.dayOfWeek, rec.hourOfDay),
      }
    })
  }

  private convertToMountainTime(utcDate: Date): Date {
    // Convert UTC to Mountain Time
    // Mountain Time is UTC-7 (MST) or UTC-6 (MDT)
    // We'll use a library approach for proper DST handling
    const mtString = utcDate.toLocaleString('en-US', { timeZone: 'America/Denver' })
    return new Date(mtString)
  }

  private getNextOccurrence(targetDay: number, targetHour: number): Date {
    // Get current time in Mountain Time
    const nowMT = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Denver' }))
    const currentDay = nowMT.getDay()
    const currentHour = nowMT.getHours()

    let daysUntilTarget = targetDay - currentDay
    if (daysUntilTarget < 0 || (daysUntilTarget === 0 && targetHour <= currentHour)) {
      daysUntilTarget += 7
    }

    const nextDate = new Date(nowMT)
    nextDate.setDate(nowMT.getDate() + daysUntilTarget)
    nextDate.setHours(targetHour, 0, 0, 0)

    return nextDate
  }

  async getActivityHeatmap(subredditName: string): Promise<any[]> {
    const activities = await prisma.subredditActivity.findMany({
      where: { subredditName },
      orderBy: [
        { dayOfWeek: 'asc' },
        { hourOfDay: 'asc' },
      ],
    })

    if (activities.length === 0) {
      return []
    }

    const maxEngagement = Math.max(...activities.map(a => a.engagementRate))
    
    return activities.map((activity) => ({
      dayOfWeek: activity.dayOfWeek,
      hourOfDay: activity.hourOfDay,
      engagementRate: activity.engagementRate,
      normalizedEngagement: activity.engagementRate / maxEngagement,
      avgScore: activity.avgScore,
      avgComments: activity.avgComments,
      sampleSize: activity.sampleSize,
    }))
  }
}

export const timingAnalyzer = new TimingAnalyzer()

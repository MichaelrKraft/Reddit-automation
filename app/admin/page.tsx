'use client'

import { useEffect, useState } from 'react'
import {
  Users,
  UserPlus,
  Activity,
  TrendingUp,
  Clock,
  Target,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Send,
  Eye,
  CheckCircle,
  XCircle,
  MessageSquare,
  Search
} from 'lucide-react'

interface Stats {
  users: {
    total: number
    new24h: number
    new7d: number
    new30d: number
    byTier: {
      founder: number
      alpha: number
    }
    lifetimeDeal: number
  }
  activeUsers: {
    dau: number
    wau: number
    mau: number
  }
  features: {
    redditAccounts: number
    posts: number
    drafts: number
    spyAccounts: number
    opportunities: number
    keywords: number
  }
  conversion: {
    usersWithRedditAccounts: number
    usersWithPosts: number
    redditConnectionRate: number
    postCreationRate: number
  }
  recentSignups: Array<{
    id: string
    email: string
    tier: string
    signupNumber: number
    createdAt: string
  }>
  topEvents24h: Array<{
    eventName: string
    count: number
  }>
}

interface ActivityItem {
  id: string
  type: 'signup' | 'post_published' | 'reddit_connected' | 'warmup_completed' | 'warmup_failed' | 'payment' | 'spy_created' | 'keyword_added'
  user: string
  details: string
  timestamp: string
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
}) {
  return (
    <div className="bg-[#111118] rounded-xl border border-gray-800 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-white mt-2">{value}</p>
          {subtitle && (
            <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
          )}
          {trendValue && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${
              trend === 'up' ? 'text-green-500' :
              trend === 'down' ? 'text-red-500' : 'text-gray-400'
            }`}>
              {trend === 'up' && <ArrowUpRight className="w-4 h-4" />}
              {trend === 'down' && <ArrowDownRight className="w-4 h-4" />}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className="p-3 bg-orange-500/10 rounded-lg">
          <Icon className="w-6 h-6 text-orange-500" />
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activitiesLoading, setActivitiesLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchActivities() {
    try {
      setActivitiesLoading(true)
      const response = await fetch('/api/admin/activity-feed?limit=20')
      if (!response.ok) throw new Error('Failed to fetch activities')
      const data = await response.json()
      setActivities(data.activities || [])
    } catch (err) {
      console.error('Failed to fetch activities:', err)
    } finally {
      setActivitiesLoading(false)
    }
  }

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/admin/stats')
        if (!response.ok) throw new Error('Failed to fetch stats')
        const data = await response.json()
        setStats(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    fetchActivities()
    // Refresh stats every 30 seconds, activities every 10 seconds
    const statsInterval = setInterval(fetchStats, 30000)
    const activitiesInterval = setInterval(fetchActivities, 10000)
    return () => {
      clearInterval(statsInterval)
      clearInterval(activitiesInterval)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
        <p className="text-red-400">{error || 'Failed to load stats'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* User Stats */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">User Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Users"
            value={stats.users.total}
            subtitle={`${stats.users.byTier.founder} founders, ${stats.users.byTier.alpha} alpha`}
            icon={Users}
          />
          <StatCard
            title="New Users (24h)"
            value={stats.users.new24h}
            trendValue={`${stats.users.new7d} this week`}
            trend={stats.users.new24h > 0 ? 'up' : 'neutral'}
            icon={UserPlus}
          />
          <StatCard
            title="DAU"
            value={stats.activeUsers.dau}
            subtitle={`WAU: ${stats.activeUsers.wau} / MAU: ${stats.activeUsers.mau}`}
            icon={Activity}
          />
          <StatCard
            title="Lifetime Deals"
            value={stats.users.lifetimeDeal}
            subtitle={`$${stats.users.lifetimeDeal * 29} revenue`}
            icon={TrendingUp}
          />
        </div>
      </section>

      {/* Conversion Stats */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Conversion Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Reddit Connection Rate"
            value={`${stats.conversion.redditConnectionRate}%`}
            subtitle={`${stats.conversion.usersWithRedditAccounts} of ${stats.users.total} users`}
            icon={Target}
          />
          <StatCard
            title="Post Creation Rate"
            value={`${stats.conversion.postCreationRate}%`}
            subtitle={`${stats.conversion.usersWithPosts} users created posts`}
            icon={BarChart3}
          />
          <StatCard
            title="Total Posts"
            value={stats.features.posts}
            subtitle={`${stats.features.drafts} drafts`}
            icon={Clock}
          />
          <StatCard
            title="Reddit Accounts"
            value={stats.features.redditAccounts}
            subtitle="Connected accounts"
            icon={Users}
          />
        </div>
      </section>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Signups */}
        <section className="bg-[#111118] rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Signups</h2>
          <div className="space-y-3">
            {stats.recentSignups.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
              >
                <div>
                  <p className="text-white text-sm font-medium">{user.email}</p>
                  <p className="text-gray-500 text-xs">
                    #{user.signupNumber} · {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  user.tier === 'FOUNDER'
                    ? 'bg-orange-500/10 text-orange-500'
                    : 'bg-blue-500/10 text-blue-500'
                }`}>
                  {user.tier}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Top Events */}
        <section className="bg-[#111118] rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Top Events (24h)</h2>
          {stats.topEvents24h.length > 0 ? (
            <div className="space-y-3">
              {stats.topEvents24h.map((event, i) => (
                <div
                  key={event.eventName}
                  className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 text-sm w-6">{i + 1}.</span>
                    <span className="text-white text-sm font-mono">
                      {event.eventName.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="text-orange-500 font-medium">{event.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No events tracked yet</p>
          )}
        </section>
      </div>

      {/* Live Activity Feed */}
      <section className="bg-[#111118] rounded-xl border border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-semibold text-white">Live Activity Feed</h2>
            <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded-full">
              Auto-refreshes
            </span>
          </div>
          <button
            onClick={fetchActivities}
            disabled={activitiesLoading}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${activitiesLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {activitiesLoading && activities.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 text-gray-500 animate-spin" />
          </div>
        ) : activities.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No recent activity</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {activities.map((activity) => {
              const activityConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
                signup: { icon: UserPlus, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                post_published: { icon: Send, color: 'text-green-400', bg: 'bg-green-500/10' },
                reddit_connected: { icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                warmup_completed: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                warmup_failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
                spy_created: { icon: Eye, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                keyword_added: { icon: Search, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
                payment: { icon: TrendingUp, color: 'text-yellow-400', bg: 'bg-yellow-500/10' }
              }
              const config = activityConfig[activity.type] || { icon: Activity, color: 'text-gray-400', bg: 'bg-gray-500/10' }
              const Icon = config.icon

              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 bg-gray-900/50 rounded-lg hover:bg-gray-900 transition-colors"
                >
                  <div className={`p-2 rounded-lg ${config.bg}`}>
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm">{activity.details}</p>
                    <p className="text-gray-500 text-xs mt-0.5 truncate">{activity.user}</p>
                  </div>
                  <span className="text-gray-500 text-xs whitespace-nowrap">
                    {new Date(activity.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Feature Usage Summary */}
      <section className="bg-[#111118] rounded-xl border border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Feature Usage</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Spy Accounts', value: stats.features.spyAccounts },
            { label: 'Opportunities', value: stats.features.opportunities },
            { label: 'Keywords', value: stats.features.keywords },
            { label: 'Posts', value: stats.features.posts },
            { label: 'Drafts', value: stats.features.drafts },
            { label: 'Reddit Accounts', value: stats.features.redditAccounts }
          ].map((feature) => (
            <div key={feature.label} className="text-center p-4 bg-gray-900/50 rounded-lg">
              <p className="text-2xl font-bold text-white">{feature.value}</p>
              <p className="text-gray-400 text-sm mt-1">{feature.label}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import WarmupOnboarding from './WarmupOnboarding'
import WarmupJourneyStepper from './WarmupJourneyStepper'

interface WarmupAccount {
  id: string
  username: string
  karma: number
  status: string
  isActive: boolean
  daysInWarmup: number
  progressPercent: number
  expectedPhase: string
  startedAt: string | null
  completedAt: string | null
  totalActions: number
  recentActions: Array<{
    date: string
    actions: Array<{ type: string; count: number; timestamp: string }>
  }>
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical'
  checks: {
    database: { status: string; message: string }
    redis: { status: string; message: string }
    workers: { status: string; message: string }
    accounts: { status: string; message: string }
  }
  metrics: {
    activeAccounts: number
    completedAccounts: number
    failedAccounts: number
    jobSuccessRate: number
  }
  alerts: Array<{
    severity: string
    message: string
    timestamp: string
  }>
}

interface Analytics {
  summary: {
    totalAccounts: number
    activeAccounts: number
    completedAccounts: number
    failedAccounts: number
    successRate: number
    failureRate: number
    avgCompletionDays: number | null
    avgKarmaAtCompletion: number | null
  }
  phaseDistribution: Record<string, number>
  actionStats: {
    totalUpvotes: number
    totalComments: number
    totalPosts: number
  }
  timeline: Array<{
    date: string
    started: number
    completed: number
    failed: number
    totalKarma: number
  }>
}

interface QueueStatus {
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  nextJob: { accountId: string; scheduledFor: string } | null
}

// Phase targets (from warmup-worker.ts)
const WARMUP_PHASE_TARGETS = {
  PHASE_1_UPVOTES: { days: 3, upvotes: 5, comments: 0, posts: 0 },
  PHASE_2_COMMENTS: { days: 4, upvotes: 5, comments: 2, posts: 0 },
  PHASE_3_POSTS: { days: 7, upvotes: 3, comments: 2, posts: 1 },
  PHASE_4_MIXED: { days: 16, upvotes: 4, comments: 3, posts: 1 },
}

export default function WarmupDashboard() {
  const [accounts, setAccounts] = useState<WarmupAccount[]>([])
  const [summary, setSummary] = useState({ total: 0, active: 0, completed: 0, failed: 0 })
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(true)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [addingAccount, setAddingAccount] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'queue'>('overview')

  useEffect(() => {
    fetchData()
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchData() {
    try {
      setLoading(true)

      // Fetch all data in parallel
      const [accountsRes, healthRes, analyticsRes, queueRes] = await Promise.all([
        fetch('/api/warmup'),
        fetch('/api/warmup/health'),
        fetch('/api/warmup/analytics'),
        fetch('/api/warmup/queue').catch(() => null), // Queue endpoint may not exist yet
      ])

      // Process accounts
      const accountsData = await accountsRes.json()
      setAccounts(accountsData.accounts || [])
      setSummary(accountsData.summary || { total: 0, active: 0, completed: 0, failed: 0 })

      // Process health
      const healthData = await healthRes.json()
      setHealth(healthData)

      // Process analytics
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json()
        setAnalytics(analyticsData)
      }

      // Process queue status (may not exist yet)
      if (queueRes && queueRes.ok) {
        const queueData = await queueRes.json()
        setQueueStatus(queueData)
      }
    } catch (error) {
      console.error('Failed to fetch warmup data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAccountAction(accountId: string, action: 'pause' | 'resume' | 'stop') {
    try {
      setActionLoading(true)
      setSelectedAccount(accountId)

      const response = await fetch('/api/warmup', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, action }),
      })

      const data = await response.json()

      if (response.ok) {
        alert(data.message)
        await fetchData()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      alert('Failed to perform action')
    } finally {
      setActionLoading(false)
      setSelectedAccount(null)
    }
  }

  function handleStartWarmup() {
    // Hide onboarding and show the add account form
    setShowOnboarding(false)
    setShowAddAccount(true)
  }

  async function handleAddAccount() {
    if (!newUsername.trim()) {
      setAddError('Please enter your Reddit username')
      return
    }

    setAddingAccount(true)
    setAddError(null)

    try {
      const response = await fetch('/api/warmup/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add account')
      }

      // Success - refresh data and reset form
      setNewUsername('')
      setShowAddAccount(false)
      await fetchData()

      // Now start the warmup for this account
      if (data.account?.id) {
        await handleStartAccountWarmup(data.account.id)
      }
    } catch (error: any) {
      setAddError(error.message)
    } finally {
      setAddingAccount(false)
    }
  }

  async function handleStartAccountWarmup(accountId: string) {
    try {
      const response = await fetch('/api/warmup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      })

      const data = await response.json()

      if (response.ok) {
        alert(data.message || 'Warmup started!')
        await fetchData()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      alert('Failed to start warmup')
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'text-green-400'
      case 'FAILED': return 'text-red-400'
      case 'PAUSED': return 'text-yellow-400'
      case 'NOT_STARTED': return 'text-gray-400'
      default: return 'text-blue-400'
    }
  }

  function getStatusBadge(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'bg-green-500/20 text-green-400 border-green-500'
      case 'FAILED': return 'bg-red-500/20 text-red-400 border-red-500'
      case 'PAUSED': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500'
      case 'PHASE_1_UPVOTES': return 'bg-blue-500/20 text-blue-400 border-blue-500'
      case 'PHASE_2_COMMENTS': return 'bg-purple-500/20 text-purple-400 border-purple-500'
      case 'PHASE_3_POSTS': return 'bg-indigo-500/20 text-indigo-400 border-indigo-500'
      case 'PHASE_4_MIXED': return 'bg-pink-500/20 text-pink-400 border-pink-500'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500'
    }
  }

  function formatStatus(status: string): string {
    return status.replace(/_/g, ' ').replace(/PHASE (\d)/, 'Phase $1:')
  }

  function getHealthBadge(status: string): string {
    switch (status) {
      case 'healthy': return 'bg-green-500/20 text-green-400 border-green-500'
      case 'degraded': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500'
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500'
    }
  }

  // Show onboarding if no accounts and user hasn't dismissed it
  if (accounts.length === 0 && !loading && showOnboarding) {
    return <WarmupOnboarding onStartWarmup={handleStartWarmup} />
  }

  // Render Activity Timeline Chart (CSS-only bar chart)
  function renderActivityTimeline() {
    if (!analytics?.timeline || analytics.timeline.length === 0) {
      return <div className="text-gray-400 text-center py-8">No activity data yet</div>
    }

    const last7Days = analytics.timeline.slice(-7)
    const maxKarma = Math.max(...last7Days.map(d => d.totalKarma), 1)

    return (
      <div className="feature-card rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">📊 Activity Timeline (Last 7 Days)</h3>
        <div className="flex items-end justify-between gap-2 h-40">
          {last7Days.map((day, idx) => (
            <div key={day.date} className="flex-1 flex flex-col items-center">
              <div className="w-full flex flex-col items-center justify-end h-32">
                <div
                  className="w-full bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t transition-all duration-300"
                  style={{ height: `${(day.totalKarma / maxKarma) * 100}%`, minHeight: day.totalKarma > 0 ? '8px' : '2px' }}
                  title={`${day.totalKarma} actions`}
                />
              </div>
              <div className="text-xs text-gray-400 mt-2">
                {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className="text-xs text-gray-500">{day.totalKarma}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-center gap-6 text-xs text-gray-400">
          <span>🟢 Started: {last7Days.reduce((sum, d) => sum + d.started, 0)}</span>
          <span>✅ Completed: {last7Days.reduce((sum, d) => sum + d.completed, 0)}</span>
          <span>❌ Failed: {last7Days.reduce((sum, d) => sum + d.failed, 0)}</span>
        </div>
      </div>
    )
  }

  // Render Phase Distribution (visual pie-like chart)
  function renderPhaseDistribution() {
    if (!analytics?.phaseDistribution) return null

    const phases = [
      { key: 'PHASE_1_UPVOTES', label: 'Phase 1: Upvotes', color: 'bg-blue-500' },
      { key: 'PHASE_2_COMMENTS', label: 'Phase 2: Comments', color: 'bg-purple-500' },
      { key: 'PHASE_3_POSTS', label: 'Phase 3: Posts', color: 'bg-indigo-500' },
      { key: 'PHASE_4_MIXED', label: 'Phase 4: Mixed', color: 'bg-pink-500' },
      { key: 'COMPLETED', label: 'Completed', color: 'bg-green-500' },
      { key: 'PAUSED', label: 'Paused', color: 'bg-yellow-500' },
      { key: 'FAILED', label: 'Failed', color: 'bg-red-500' },
    ]

    const total = Object.values(analytics.phaseDistribution).reduce((a, b) => a + b, 0) || 1

    return (
      <div className="feature-card rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">📈 Phase Distribution</h3>
        <div className="space-y-3">
          {phases.map(phase => {
            const count = analytics.phaseDistribution[phase.key] || 0
            const percent = (count / total) * 100
            return (
              <div key={phase.key} className="flex items-center gap-3">
                <div className="w-32 text-sm text-gray-300 truncate">{phase.label}</div>
                <div className="flex-1 bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className={`${phase.color} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="w-12 text-right text-sm text-gray-400">{count}</div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Render Action Stats
  function renderActionStats() {
    if (!analytics?.actionStats) return null

    return (
      <div className="feature-card rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">⚡ Action Statistics</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-[#1a1a24] rounded-lg border border-gray-700">
            <div className="text-3xl font-bold text-orange-400">⬆️</div>
            <div className="text-2xl font-bold text-white mt-2">{analytics.actionStats.totalUpvotes}</div>
            <div className="text-sm text-gray-400">Upvotes</div>
          </div>
          <div className="text-center p-4 bg-[#1a1a24] rounded-lg border border-gray-700">
            <div className="text-3xl font-bold text-blue-400">💬</div>
            <div className="text-2xl font-bold text-white mt-2">{analytics.actionStats.totalComments}</div>
            <div className="text-sm text-gray-400">Comments</div>
          </div>
          <div className="text-center p-4 bg-[#1a1a24] rounded-lg border border-gray-700">
            <div className="text-3xl font-bold text-green-400">📝</div>
            <div className="text-2xl font-bold text-white mt-2">{analytics.actionStats.totalPosts}</div>
            <div className="text-sm text-gray-400">Posts</div>
          </div>
        </div>
      </div>
    )
  }

  // Render Portfolio Analytics Summary
  function renderPortfolioAnalytics() {
    if (!analytics?.summary) return null

    return (
      <div className="feature-card rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">📊 Portfolio Analytics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-[#1a1a24] rounded-lg border border-gray-700">
            <div className="text-2xl font-bold text-green-400">{analytics.summary.successRate}%</div>
            <div className="text-sm text-gray-400">Success Rate</div>
          </div>
          <div className="text-center p-4 bg-[#1a1a24] rounded-lg border border-gray-700">
            <div className="text-2xl font-bold text-blue-400">
              {analytics.summary.avgCompletionDays ? `${analytics.summary.avgCompletionDays}d` : 'N/A'}
            </div>
            <div className="text-sm text-gray-400">Avg Completion</div>
          </div>
          <div className="text-center p-4 bg-[#1a1a24] rounded-lg border border-gray-700">
            <div className="text-2xl font-bold text-purple-400">
              {analytics.summary.avgKarmaAtCompletion || 'N/A'}
            </div>
            <div className="text-sm text-gray-400">Avg Final Karma</div>
          </div>
          <div className="text-center p-4 bg-[#1a1a24] rounded-lg border border-gray-700">
            <div className="text-2xl font-bold text-red-400">{analytics.summary.failureRate}%</div>
            <div className="text-sm text-gray-400">Failure Rate</div>
          </div>
        </div>
      </div>
    )
  }

  // Render Queue Monitor
  function renderQueueMonitor() {
    return (
      <div className="feature-card rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">⏳ Job Queue Monitor</h3>
        {queueStatus ? (
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-3">
              <div className="text-center p-3 bg-[#1a1a24] rounded-lg border border-gray-700">
                <div className="text-xl font-bold text-yellow-400">{queueStatus.waiting}</div>
                <div className="text-xs text-gray-400">Waiting</div>
              </div>
              <div className="text-center p-3 bg-[#1a1a24] rounded-lg border border-gray-700">
                <div className="text-xl font-bold text-blue-400">{queueStatus.active}</div>
                <div className="text-xs text-gray-400">Active</div>
              </div>
              <div className="text-center p-3 bg-[#1a1a24] rounded-lg border border-gray-700">
                <div className="text-xl font-bold text-gray-400">{queueStatus.delayed}</div>
                <div className="text-xs text-gray-400">Delayed</div>
              </div>
              <div className="text-center p-3 bg-[#1a1a24] rounded-lg border border-gray-700">
                <div className="text-xl font-bold text-green-400">{queueStatus.completed}</div>
                <div className="text-xs text-gray-400">Completed</div>
              </div>
              <div className="text-center p-3 bg-[#1a1a24] rounded-lg border border-gray-700">
                <div className="text-xl font-bold text-red-400">{queueStatus.failed}</div>
                <div className="text-xs text-gray-400">Failed</div>
              </div>
            </div>
            {queueStatus.nextJob && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="text-sm text-blue-400">
                  ⏰ Next job: Account {queueStatus.nextJob.accountId.slice(0, 8)}...
                  scheduled for {new Date(queueStatus.nextJob.scheduledFor).toLocaleTimeString()}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-400">
            <div className="text-4xl mb-2">📋</div>
            <div>Queue status not available</div>
            <div className="text-xs mt-1">Queue monitoring requires Redis connection</div>
          </div>
        )}
      </div>
    )
  }

  // Render Detailed Action Log for expanded account
  function renderDetailedActionLog(account: WarmupAccount) {
    if (!account.recentActions || account.recentActions.length === 0) {
      return (
        <div className="text-gray-400 text-center py-4">
          No recent actions recorded yet
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {account.recentActions.slice(0, 7).map((day, idx) => (
          <div key={day.date} className="p-3 bg-[#12121a] rounded-lg border border-gray-700">
            <div className="text-sm font-medium text-gray-300 mb-2">
              {new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
            <div className="space-y-1">
              {day.actions.map((action, actionIdx) => (
                <div key={actionIdx} className="flex items-center justify-between text-xs">
                  <span className={`
                    ${action.type === 'upvote' ? 'text-orange-400' : ''}
                    ${action.type === 'comment' ? 'text-blue-400' : ''}
                    ${action.type === 'post' ? 'text-green-400' : ''}
                  `}>
                    {action.type === 'upvote' && '⬆️'}
                    {action.type === 'comment' && '💬'}
                    {action.type === 'post' && '📝'}
                    {' '}{action.type} x{action.count}
                  </span>
                  <span className="text-gray-500">
                    {new Date(action.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Render Phase Progress Details
  function renderPhaseProgressDetails(account: WarmupAccount) {
    const phaseKey = account.status as keyof typeof WARMUP_PHASE_TARGETS
    const targets = WARMUP_PHASE_TARGETS[phaseKey]

    if (!targets) {
      return <div className="text-gray-400 text-sm">Phase targets not available</div>
    }

    // Calculate actual daily average from recentActions
    const recentDays = account.recentActions?.length || 0
    const totalUpvotes = account.recentActions?.reduce((sum, day) =>
      sum + day.actions.filter(a => a.type === 'upvote').reduce((s, a) => s + a.count, 0), 0) || 0
    const totalComments = account.recentActions?.reduce((sum, day) =>
      sum + day.actions.filter(a => a.type === 'comment').reduce((s, a) => s + a.count, 0), 0) || 0
    const totalPosts = account.recentActions?.reduce((sum, day) =>
      sum + day.actions.filter(a => a.type === 'post').reduce((s, a) => s + a.count, 0), 0) || 0

    const avgUpvotes = recentDays > 0 ? Math.round(totalUpvotes / recentDays * 10) / 10 : 0
    const avgComments = recentDays > 0 ? Math.round(totalComments / recentDays * 10) / 10 : 0
    const avgPosts = recentDays > 0 ? Math.round(totalPosts / recentDays * 10) / 10 : 0

    return (
      <div className="grid grid-cols-3 gap-4 mt-4">
        <div className="p-3 bg-[#12121a] rounded-lg border border-gray-700">
          <div className="text-xs text-gray-400 mb-1">Daily Upvotes</div>
          <div className="flex items-baseline gap-2">
            <span className={`text-lg font-bold ${avgUpvotes >= targets.upvotes ? 'text-green-400' : 'text-orange-400'}`}>
              {avgUpvotes}
            </span>
            <span className="text-xs text-gray-500">/ {targets.upvotes} target</span>
          </div>
        </div>
        <div className="p-3 bg-[#12121a] rounded-lg border border-gray-700">
          <div className="text-xs text-gray-400 mb-1">Daily Comments</div>
          <div className="flex items-baseline gap-2">
            <span className={`text-lg font-bold ${avgComments >= targets.comments ? 'text-green-400' : 'text-blue-400'}`}>
              {avgComments}
            </span>
            <span className="text-xs text-gray-500">/ {targets.comments} target</span>
          </div>
        </div>
        <div className="p-3 bg-[#12121a] rounded-lg border border-gray-700">
          <div className="text-xs text-gray-400 mb-1">Daily Posts</div>
          <div className="flex items-baseline gap-2">
            <span className={`text-lg font-bold ${avgPosts >= targets.posts ? 'text-green-400' : 'text-purple-400'}`}>
              {avgPosts}
            </span>
            <span className="text-xs text-gray-500">/ {targets.posts} target</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Warmup Dashboard</h2>
          <p className="text-gray-400 mt-1">Monitor and manage Reddit account warm-up system</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="glass-button text-gray-300 px-4 py-2 rounded-lg transition disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-700 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-t-lg font-medium transition ${
            activeTab === 'overview'
              ? 'bg-[#00D9FF]/20 text-[#00D9FF] border-b-2 border-[#00D9FF]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          📋 Overview
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-t-lg font-medium transition ${
            activeTab === 'analytics'
              ? 'bg-[#00D9FF]/20 text-[#00D9FF] border-b-2 border-[#00D9FF]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          📊 Analytics
        </button>
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 rounded-t-lg font-medium transition ${
            activeTab === 'queue'
              ? 'bg-[#00D9FF]/20 text-[#00D9FF] border-b-2 border-[#00D9FF]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          ⏳ Queue
        </button>
      </div>

      {/* Analytics Tab Content */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {renderPortfolioAnalytics()}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderActivityTimeline()}
            {renderPhaseDistribution()}
          </div>
          {renderActionStats()}
        </div>
      )}

      {/* Queue Tab Content */}
      {activeTab === 'queue' && (
        <div className="space-y-6">
          {renderQueueMonitor()}
        </div>
      )}

      {/* Overview Tab Content (original dashboard) */}
      {activeTab === 'overview' && (
        <>
          {/* System Health */}
      {health && (
        <div className="feature-card rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">System Health</h3>
            <span className={`px-3 py-1 rounded-full border ${getHealthBadge(health.status)} text-sm font-medium uppercase`}>
              {health.status}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-[#1a1a24] rounded-lg border border-gray-700">
              <div className={`text-sm font-medium ${health.checks?.database?.status === 'healthy' ? 'text-green-400' : 'text-red-400'}`}>
                Database
              </div>
              <div className="text-xs text-gray-400 mt-1">{health.checks?.database?.message || 'Unknown'}</div>
            </div>
            <div className="text-center p-3 bg-[#1a1a24] rounded-lg border border-gray-700">
              <div className={`text-sm font-medium ${health.checks?.redis?.status === 'healthy' ? 'text-green-400' : 'text-red-400'}`}>
                Redis
              </div>
              <div className="text-xs text-gray-400 mt-1">{health.checks?.redis?.message || 'Unknown'}</div>
            </div>
            <div className="text-center p-3 bg-[#1a1a24] rounded-lg border border-gray-700">
              <div className={`text-sm font-medium ${health.checks?.workers?.status === 'healthy' ? 'text-green-400' : 'text-red-400'}`}>
                Workers
              </div>
              <div className="text-xs text-gray-400 mt-1">{health.checks?.workers?.message || 'Unknown'}</div>
            </div>
            <div className="text-center p-3 bg-[#1a1a24] rounded-lg border border-gray-700">
              <div className={`text-sm font-medium ${health.checks?.accounts?.status === 'healthy' ? 'text-green-400' : 'text-red-400'}`}>
                Accounts
              </div>
              <div className="text-xs text-gray-400 mt-1">{health.checks?.accounts?.message || 'Unknown'}</div>
            </div>
          </div>

          {/* Alerts */}
          {health.alerts && health.alerts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-300">Recent Alerts</h4>
              {health.alerts.slice(0, 3).map((alert, idx) => (
                <div key={idx} className={`p-2 rounded border ${
                  alert.severity === 'critical' ? 'bg-red-500/10 border-red-500/30' :
                  alert.severity === 'error' ? 'bg-orange-500/10 border-orange-500/30' :
                  'bg-yellow-500/10 border-yellow-500/30'
                }`}>
                  <span className="text-xs uppercase font-medium text-gray-400">{alert.severity}</span>
                  <span className="text-sm text-gray-300 ml-2">{alert.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="feature-card rounded-lg p-6 border-l-4 border-blue-500">
          <div className="text-sm font-medium text-gray-400">Total Accounts</div>
          <div className="text-3xl font-bold text-white mt-2">{summary.total}</div>
        </div>

        <div className="feature-card rounded-lg p-6 border-l-4 border-purple-500">
          <div className="text-sm font-medium text-gray-400">Active Warmup</div>
          <div className="text-3xl font-bold text-white mt-2">{summary.active}</div>
        </div>

        <div className="feature-card rounded-lg p-6 border-l-4 border-green-500">
          <div className="text-sm font-medium text-gray-400">Completed</div>
          <div className="text-3xl font-bold text-white mt-2">{summary.completed}</div>
        </div>

        <div className="feature-card rounded-lg p-6 border-l-4 border-red-500">
          <div className="text-sm font-medium text-gray-400">Failed</div>
          <div className="text-3xl font-bold text-white mt-2">{summary.failed}</div>
        </div>
      </div>

      {/* Add Account Form */}
      {showAddAccount && (
        <div className="feature-card rounded-lg p-6 mb-6 border-2 border-[#00D9FF]/50">
          <h3 className="text-lg font-semibold text-white mb-4">Add Your Reddit Account</h3>
          <p className="text-gray-400 text-sm mb-4">
            Enter your Reddit username to start the 30-day warmup process. Our AI will automatically build trust and karma for your account.
          </p>

          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Reddit Username
              </label>
              <div className="flex items-center">
                <span className="text-gray-400 mr-2">u/</span>
                <input
                  type="text"
                  placeholder="your_username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddAccount()}
                  className="flex-1 px-4 py-2 border border-gray-600 bg-[#12121a] rounded-lg focus:ring-2 focus:ring-[#00D9FF] focus:border-transparent text-white placeholder-gray-500"
                  disabled={addingAccount}
                />
              </div>
            </div>
            <button
              onClick={handleAddAccount}
              disabled={addingAccount || !newUsername.trim()}
              className="px-6 py-2 bg-gradient-to-r from-[#00D9FF] to-cyan-600 text-black font-semibold rounded-lg hover:from-cyan-400 hover:to-cyan-500 transition disabled:opacity-50"
            >
              {addingAccount ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-black"></span>
                  Adding...
                </span>
              ) : (
                'Add & Start Warmup'
              )}
            </button>
            <button
              onClick={() => setShowAddAccount(false)}
              className="px-4 py-2 text-gray-400 hover:text-white transition"
            >
              Cancel
            </button>
          </div>

          {addError && (
            <div className="mt-4 bg-red-900/50 border border-red-700 rounded-lg p-3">
              <p className="text-sm text-red-300">⚠️ {addError}</p>
            </div>
          )}
        </div>
      )}

      {/* Accounts List */}
      <div className="feature-card rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Warmup Accounts</h3>
          {!showAddAccount && (
            <button
              onClick={() => setShowAddAccount(true)}
              className="px-4 py-2 bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/50 rounded-lg hover:bg-[#00D9FF]/30 transition text-sm font-medium"
            >
              + Add Account
            </button>
          )}
        </div>

        {loading && accounts.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-reddit-orange"></div>
            <p className="text-gray-400 mt-2">Loading accounts...</p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">No warmup accounts yet.</p>
            {!showAddAccount && (
              <button
                onClick={() => setShowAddAccount(true)}
                className="px-6 py-3 bg-gradient-to-r from-[#00D9FF] to-cyan-600 text-black font-semibold rounded-lg hover:from-cyan-400 hover:to-cyan-500 transition"
              >
                Add Your First Reddit Account
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map((account) => (
              <div key={account.id} className="p-4 bg-[#1a1a24] rounded-lg border border-gray-700 hover:border-[#00D9FF] transition">
                {/* Journey Stepper */}
                <WarmupJourneyStepper
                  status={account.status}
                  daysInWarmup={account.daysInWarmup}
                  karma={account.karma}
                  isCompleted={account.status === 'COMPLETED'}
                />

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-xl font-bold text-[#00D9FF]">u/{account.username}</div>
                    <span className={`px-2 py-1 rounded border text-xs font-medium ${getStatusBadge(account.status)}`}>
                      {formatStatus(account.status)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {account.status !== 'COMPLETED' && account.status !== 'FAILED' && (
                      <>
                        {account.status !== 'PAUSED' ? (
                          <button
                            onClick={() => handleAccountAction(account.id, 'pause')}
                            disabled={actionLoading && selectedAccount === account.id}
                            className="glass-button text-yellow-400 px-3 py-1 rounded text-sm disabled:opacity-50"
                          >
                            ⏸️ Pause
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAccountAction(account.id, 'resume')}
                            disabled={actionLoading && selectedAccount === account.id}
                            className="glass-button text-green-400 px-3 py-1 rounded text-sm disabled:opacity-50"
                          >
                            ▶️ Resume
                          </button>
                        )}
                        <button
                          onClick={() => handleAccountAction(account.id, 'stop')}
                          disabled={actionLoading && selectedAccount === account.id}
                          className="glass-button text-red-400 px-3 py-1 rounded text-sm disabled:opacity-50"
                        >
                          🛑 Stop
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Progress</span>
                    <span>{account.progressPercent}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${account.progressPercent}%` }}
                    ></div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-3 text-center text-sm">
                  <div>
                    <div className="text-gray-400 text-xs">Karma</div>
                    <div className="font-semibold text-green-400">{account.karma}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs">Days</div>
                    <div className="font-semibold text-blue-400">{account.daysInWarmup}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs">Actions</div>
                    <div className="font-semibold text-purple-400">{account.totalActions}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs">Status</div>
                    <div className={`font-semibold ${account.isActive ? 'text-green-400' : 'text-red-400'}`}>
                      {account.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                {account.startedAt && (
                  <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400">
                    <span>Started: {new Date(account.startedAt).toLocaleDateString()}</span>
                    {account.completedAt && (
                      <span className="ml-4">Completed: {new Date(account.completedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                )}

                {/* Expand/Collapse Button */}
                <button
                  onClick={() => setExpandedAccount(expandedAccount === account.id ? null : account.id)}
                  className="w-full mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400 hover:text-[#00D9FF] transition flex items-center justify-center gap-2"
                >
                  {expandedAccount === account.id ? (
                    <>
                      <span>Hide Details</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </>
                  ) : (
                    <>
                      <span>Show Activity Log & Phase Details</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  )}
                </button>

                {/* Expanded Details Section */}
                {expandedAccount === account.id && (
                  <div className="mt-4 pt-4 border-t border-gray-600 space-y-4">
                    {/* Phase Progress Details */}
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-2">📊 Phase Progress (Target vs Actual)</h4>
                      {renderPhaseProgressDetails(account)}
                    </div>

                    {/* Detailed Action Log */}
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-2">📋 Recent Activity Log</h4>
                      {renderDetailedActionLog(account)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
        </>
      )}
    </div>
  )
}

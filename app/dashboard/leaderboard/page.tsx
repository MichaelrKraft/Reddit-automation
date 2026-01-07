'use client'

import { useState } from 'react'
import Link from 'next/link'
import DashboardNav from '@/components/DashboardNav'

interface LeaderboardEntry {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  totalKarma: number
  rank: number
  influenceScore: number
  totalScore: number
  postCount: number
  avgScore: number
  avgComments: number
  successRate: number
  topPosts: { title: string; score: number; url: string }[] | null
  isTracked: boolean
}

interface Leaderboard {
  id: string
  subreddit: string
  timeFilter: string
  lastAnalyzed: string
  totalUsers: number
  entries: LeaderboardEntry[]
}

export default function LeaderboardPage() {
  const [subreddit, setSubreddit] = useState('')
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isStale, setIsStale] = useState(false)
  const [trackingId, setTrackingId] = useState<string | null>(null)
  const [timeFilter, setTimeFilter] = useState<string>('month')
  const [generatingDm, setGeneratingDm] = useState<string | null>(null)

  async function fetchLeaderboard(sub: string) {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/leaderboard/${encodeURIComponent(sub)}`)
      const data = await response.json()

      if (data.leaderboard) {
        setLeaderboard(data.leaderboard)
        setIsStale(data.isStale)
      } else {
        setLeaderboard(null)
      }
    } catch (err) {
      setError('Failed to fetch leaderboard')
    } finally {
      setIsLoading(false)
    }
  }

  async function analyzeSubreddit() {
    if (!subreddit.trim()) return

    setIsAnalyzing(true)
    setError(null)

    try {
      const response = await fetch(`/api/leaderboard/${encodeURIComponent(subreddit.trim())}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeFilter, limit: 100 }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to analyze subreddit')
        return
      }

      if (data.leaderboard) {
        setLeaderboard(data.leaderboard)
        setIsStale(false)
      }
    } catch (err) {
      setError('Failed to analyze subreddit')
    } finally {
      setIsAnalyzing(false)
    }
  }

  async function trackUser(username: string) {
    if (!leaderboard) return

    setTrackingId(username)

    try {
      const response = await fetch(`/api/leaderboard/${leaderboard.subreddit}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })

      const data = await response.json()

      if (response.ok) {
        // Update local state to show tracked
        setLeaderboard(prev => {
          if (!prev) return null
          return {
            ...prev,
            entries: prev.entries.map(e =>
              e.username === username ? { ...e, isTracked: true } : e
            ),
          }
        })
      } else {
        setError(data.error || 'Failed to track user')
      }
    } catch (err) {
      setError('Failed to track user')
    } finally {
      setTrackingId(null)
    }
  }

  async function handleChatClick(entry: LeaderboardEntry) {
    setGeneratingDm(entry.username)

    try {
      // Get the user's best post for context
      const topPost = entry.topPosts?.[0]

      const response = await fetch('/api/leaderboard/generate-dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: entry.username,
          postTitle: topPost?.title || null,
          postUrl: topPost?.url || null,
          subreddit: leaderboard?.subreddit || null,
        }),
      })

      const data = await response.json()

      if (response.ok && data.message) {
        // Open Reddit DM with pre-filled message
        const dmUrl = `https://www.reddit.com/message/compose/?to=${entry.username}&message=${encodeURIComponent(data.message)}`
        window.open(dmUrl, '_blank')
      } else {
        // Fallback to empty DM on error
        console.error('[Chat] Failed to generate message:', data.error)
        window.open(`https://www.reddit.com/message/compose/?to=${entry.username}`, '_blank')
      }
    } catch (err) {
      console.error('[Chat] Error:', err)
      // Fallback to empty DM on error
      window.open(`https://www.reddit.com/message/compose/?to=${entry.username}`, '_blank')
    } finally {
      setGeneratingDm(null)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (subreddit.trim()) {
      fetchLeaderboard(subreddit.trim())
    }
  }

  function formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  function getTimeAgo(dateStr: string): string {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return `${diffDays}d ago`
    if (diffHours > 0) return `${diffHours}h ago`
    return 'Just now'
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      {/* Dot Grid Background */}
      <div className="dot-grid-background">
        <div className="dot-grid-container">
          <div className="dot-grid"></div>
          <div className="dot-grid-overlay"></div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardNav />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <span className="text-3xl">🏆</span>
              Subreddit Leaderboard
            </h1>
            <p className="text-gray-400 mt-1 text-sm sm:text-base">
              Discover top contributors in any subreddit
            </p>
          </div>
          <Link
            href="/dashboard"
            className="glass-button text-gray-300 px-4 sm:px-6 py-2 rounded-lg transition text-sm sm:text-base"
          >
            ← Back
          </Link>
        </div>

        {/* Search Form */}
        <div className="feature-card rounded-lg p-4 sm:p-6 mb-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex gap-2">
              <span className="text-gray-400 self-center">r/</span>
              <input
                type="text"
                placeholder="Enter subreddit name (e.g., startups, entrepreneur)"
                value={subreddit}
                onChange={(e) => setSubreddit(e.target.value.replace(/^r\//, ''))}
                className="flex-1 px-4 py-3 border border-gray-600 bg-[#12121a] rounded-lg focus:ring-2 focus:ring-[#00D9FF] focus:border-transparent text-white placeholder-gray-500"
              />
            </div>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="px-4 py-3 border border-gray-600 bg-[#12121a] rounded-lg text-white"
            >
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
              <option value="year">Past Year</option>
              <option value="all">All Time</option>
            </select>
            <button
              type="button"
              onClick={analyzeSubreddit}
              disabled={isAnalyzing || !subreddit.trim()}
              className="bg-gradient-to-r from-[#00D9FF] to-cyan-600 text-white px-6 sm:px-8 py-3 rounded-lg hover:opacity-90 transition disabled:opacity-50 font-medium"
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze'}
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D9FF] mx-auto mb-4"></div>
            <p className="text-gray-400">Loading leaderboard...</p>
          </div>
        )}

        {/* Leaderboard Results */}
        {leaderboard && !isLoading && (
          <div className="feature-card rounded-lg">
            {/* Leaderboard Header */}
            <div className="border-b border-gray-700 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div>
                  <h2 className="text-xl font-bold text-[#00D9FF]">
                    r/{leaderboard.subreddit}
                  </h2>
                  <p className="text-sm text-gray-400">
                    {leaderboard.totalUsers} contributors found • Updated {getTimeAgo(leaderboard.lastAnalyzed)}
                    {isStale && (
                      <span className="ml-2 text-yellow-400">(Stale - click Analyze to refresh)</span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href="/dashboard/spy-mode"
                    className="text-sm px-4 py-2 bg-purple-600/20 text-purple-400 border border-purple-500/50 rounded-lg hover:bg-purple-600/30 transition"
                  >
                    View Spy Mode →
                  </Link>
                </div>
              </div>

              {/* Scoring Info Panel */}
              <div className="mt-4 p-4 bg-[#0a0a12] border-2 border-[#00D9FF] rounded-lg shadow-[0_0_20px_rgba(0,217,255,0.5),0_0_40px_rgba(0,217,255,0.2)]">
                <div className="flex items-start gap-3">
                  <span className="text-lg">ℹ️</span>
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-2">How Influence Score is Calculated</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                        <span className="text-[#00D9FF] font-bold">30%</span>
                        <span>📊 Total Score</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[#00D9FF] font-bold">25%</span>
                        <span>📈 Avg Score</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[#00D9FF] font-bold">20%</span>
                        <span>📝 Post Count</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[#00D9FF] font-bold">15%</span>
                        <span>💬 Avg Comments</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[#00D9FF] font-bold">10%</span>
                        <span>🎯 Success Rate</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Hover over any stat icon for detailed explanation. Success Rate = % of posts with 100+ upvotes.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Entries List */}
            <div className="p-4 sm:p-6 space-y-4">
              {leaderboard.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="border border-gray-700 bg-[#12121a] rounded-lg p-4 hover:border-[#00D9FF]/50 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Rank & User Info */}
                    <div className="flex items-center gap-4">
                      <div className={`text-2xl font-bold ${
                        entry.rank === 1 ? 'text-yellow-400' :
                        entry.rank === 2 ? 'text-gray-300' :
                        entry.rank === 3 ? 'text-amber-600' :
                        'text-gray-500'
                      }`}>
                        #{entry.rank}
                      </div>
                      <div>
                        <a
                          href={`https://reddit.com/u/${entry.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-white hover:text-[#00D9FF] transition"
                        >
                          u/{entry.username}
                        </a>
                        <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-400">
                          <span title="Influence Score (0-100) - Weighted composite: 30% Total Score + 25% Avg Score + 20% Post Count + 15% Avg Comments + 10% Success Rate" className="flex items-center gap-1 cursor-help">
                            <span className="text-[#00D9FF]">⭐</span>
                            {entry.influenceScore.toFixed(1)}
                          </span>
                          <span title="Total Score - Sum of all upvotes received on posts in this subreddit" className="cursor-help">
                            📊 {formatNumber(entry.totalScore)}
                          </span>
                          <span title="Post Count - Total number of posts made in this subreddit during the selected time period" className="cursor-help">
                            📝 {entry.postCount} posts
                          </span>
                          <span title="Average Score - Average upvotes per post (Total Score ÷ Post Count)" className="cursor-help">
                            📈 {formatNumber(Math.round(entry.avgScore))} avg
                          </span>
                          <span title="Success Rate - Percentage of posts that reached 100+ upvotes" className="cursor-help">
                            🎯 {entry.successRate.toFixed(0)}% hit
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {/* Chat/DM Button */}
                      <button
                        onClick={() => handleChatClick(entry)}
                        disabled={generatingDm === entry.username}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/50 hover:bg-[#00D9FF]/30 disabled:opacity-50"
                        title="Generate AI message and open Reddit DM"
                      >
                        {generatingDm === entry.username ? '⏳ Writing...' : '💬 Chat'}
                      </button>

                      {/* Track Button */}
                      <button
                        onClick={() => trackUser(entry.username)}
                        disabled={entry.isTracked || trackingId === entry.username}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                          entry.isTracked
                            ? 'bg-green-900/50 text-green-400 cursor-default'
                            : 'bg-purple-600/20 text-purple-400 border border-purple-500/50 hover:bg-purple-600/30'
                        }`}
                      >
                        {trackingId === entry.username
                          ? '...'
                          : entry.isTracked
                          ? '✓ Tracked'
                          : '+ Track'}
                      </button>
                    </div>
                  </div>

                  {/* Top Posts Preview */}
                  {entry.topPosts && entry.topPosts.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-700/50">
                      <p className="text-xs text-gray-500 mb-2">Top posts:</p>
                      <div className="space-y-1">
                        {entry.topPosts.slice(0, 2).map((post, i) => (
                          <a
                            key={i}
                            href={post.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-sm text-gray-400 hover:text-white truncate"
                          >
                            <span className="text-gray-500">{formatNumber(post.score)} pts</span>
                            {' • '}
                            {post.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!leaderboard && !isLoading && !error && (
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">🔍</span>
            <h3 className="text-xl font-semibold text-white mb-2">
              Find Top Contributors
            </h3>
            <p className="text-gray-400 max-w-md mx-auto">
              Enter a subreddit name above and click Analyze to discover the most influential users based on their posting history.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

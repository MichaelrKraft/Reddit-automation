'use client'

import { useState, useEffect } from 'react'

interface AnalyticsSummary {
  totalPosts: number
  totalUpvotes: number
  totalComments: number
  totalEngagement: number
  avgScore: number
}

interface SubredditStats {
  name: string
  displayName: string
  posts: number
  upvotes: number
  comments: number
  engagement: number
}

interface TopPost {
  id: string
  title: string
  subreddit: string
  upvotes: number
  comments: number
  score: number
  url: string | null
  postedAt: string | null
}

interface TimelineData {
  date: string
  posts: number
  upvotes: number
  comments: number
  engagement: number
}

export default function AnalyticsDashboard() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [topSubreddits, setTopSubreddits] = useState<SubredditStats[]>([])
  const [topPosts, setTopPosts] = useState<TopPost[]>([])
  const [timeline, setTimeline] = useState<TimelineData[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [timeRange, setTimeRange] = useState('30')

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  async function fetchAnalytics() {
    try {
      setLoading(true)
      const response = await fetch(`/api/analytics/summary?days=${timeRange}`)
      const data = await response.json()
      
      setSummary(data.summary)
      setTopSubreddits(data.topSubreddits || [])
      setTopPosts(data.topPosts || [])
      setTimeline(data.timeline || [])
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  async function refreshAnalytics() {
    try {
      setRefreshing(true)
      const response = await fetch('/api/analytics/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = await response.json()
      alert(`Updated analytics for ${data.updatedCount} posts!`)
      await fetchAnalytics()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setRefreshing(false)
    }
  }

  function exportCSV() {
    window.open(`/api/analytics/export?days=${timeRange}`, '_blank')
  }

  function formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Analytics Dashboard</h2>
          <p className="text-gray-400 mt-1">Track your Reddit performance</p>
        </div>
        <div className="flex gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-600 bg-[#12121a] text-white rounded-lg focus:ring-2 focus:ring-reddit-orange focus:border-transparent"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <button
            onClick={refreshAnalytics}
            disabled={refreshing}
            className="glass-button text-gray-300 px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            {refreshing ? 'Refreshing...' : '🔄 Refresh Data'}
          </button>
          <button
            onClick={exportCSV}
            className="bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-4 py-2 rounded-lg hover:bg-[#00D9FF]/30 transition font-semibold"
          >
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-reddit-orange"></div>
          <p className="text-gray-400 mt-2">Loading analytics...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="feature-card rounded-lg p-6 border-l-4 border-reddit-orange">
              <div className="text-sm font-medium text-gray-400">Total Posts</div>
              <div className="text-3xl font-bold text-white mt-2">{summary?.totalPosts || 0}</div>
            </div>

            <div className="feature-card rounded-lg p-6 border-l-4 border-green-500">
              <div className="text-sm font-medium text-gray-400">Total Upvotes</div>
              <div className="text-3xl font-bold text-white mt-2">{formatNumber(summary?.totalUpvotes || 0)}</div>
            </div>

            <div className="feature-card rounded-lg p-6 border-l-4 border-blue-500">
              <div className="text-sm font-medium text-gray-400">Total Comments</div>
              <div className="text-3xl font-bold text-white mt-2">{formatNumber(summary?.totalComments || 0)}</div>
            </div>

            <div className="feature-card rounded-lg p-6 border-l-4 border-purple-500">
              <div className="text-sm font-medium text-gray-400">Total Engagement</div>
              <div className="text-3xl font-bold text-white mt-2">{formatNumber(summary?.totalEngagement || 0)}</div>
            </div>

            <div className="feature-card rounded-lg p-6 border-l-4 border-yellow-500">
              <div className="text-sm font-medium text-gray-400">Avg Score</div>
              <div className="text-3xl font-bold text-white mt-2">{summary?.avgScore || 0}</div>
            </div>
          </div>

          {/* Top Subreddits */}
          <div className="feature-card rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Top Performing Subreddits</h3>
            {topSubreddits.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No data available yet. Post some content to see analytics!</p>
            ) : (
              <div className="space-y-3">
                {topSubreddits.map((sub, index) => (
                  <div key={sub.name} className="flex items-center gap-4 p-3 bg-[#1a1a24] rounded-lg border border-gray-700">
                    <div className="text-2xl font-bold text-gray-500 w-8">#{index + 1}</div>
                    <div className="flex-1">
                      <div className="font-semibold text-[#00D9FF]">{sub.displayName}</div>
                      <div className="text-sm text-gray-400">{sub.posts} posts</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">↑ {formatNumber(sub.upvotes)}</div>
                      <div className="text-sm text-gray-400">💬 {formatNumber(sub.comments)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-purple-400">{formatNumber(sub.engagement)}</div>
                      <div className="text-xs text-gray-500">engagement</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Posts */}
          <div className="feature-card rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Top Performing Posts</h3>
            {topPosts.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No posts found in this time range</p>
            ) : (
              <div className="space-y-3">
                {topPosts.map((post, index) => (
                  <div key={post.id} className="flex items-center gap-4 p-4 bg-[#1a1a24] rounded-lg border border-gray-700 hover:border-[#00D9FF] transition">
                    <div className="text-2xl font-bold text-gray-500 w-8">#{index + 1}</div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white line-clamp-1">{post.title}</h4>
                      <div className="flex gap-3 text-sm text-gray-400 mt-1">
                        <span className="text-[#00D9FF]">{post.subreddit}</span>
                        <span>•</span>
                        <span>{post.postedAt && new Date(post.postedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-semibold text-green-400">↑ {formatNumber(post.upvotes)}</div>
                        <div className="text-xs text-gray-500">upvotes</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-blue-400">💬 {formatNumber(post.comments)}</div>
                        <div className="text-xs text-gray-500">comments</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-purple-400">{post.score}</div>
                        <div className="text-xs text-gray-500">score</div>
                      </div>
                    </div>
                    {post.url && (
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-reddit-orange hover:underline text-sm"
                      >
                        View →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeline Chart (Simple Bar Chart) */}
          <div className="feature-card rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Engagement Timeline</h3>
            {timeline.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No timeline data available</p>
            ) : (
              <div className="space-y-2">
                {timeline.map((day) => {
                  const maxEngagement = Math.max(...timeline.map(d => d.engagement))
                  const widthPercent = maxEngagement > 0 ? (day.engagement / maxEngagement) * 100 : 0

                  return (
                    <div key={day.date} className="flex items-center gap-3">
                      <div className="text-xs text-gray-400 w-20 text-right">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="flex-1 bg-gray-700 rounded-full h-8 relative overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-reddit-orange to-purple-500 h-full rounded-full transition-all duration-300 flex items-center justify-end px-3"
                          style={{ width: `${widthPercent}%` }}
                        >
                          {widthPercent > 15 && (
                            <span className="text-xs font-medium text-white">
                              {formatNumber(day.engagement)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 w-24">
                        {day.posts} post{day.posts !== 1 ? 's' : ''}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

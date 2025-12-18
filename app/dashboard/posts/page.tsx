'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import DashboardNav from '@/components/DashboardNav'

interface Post {
  id: string
  title: string
  content: string
  status: string
  scheduledAt: string | null
  postedAt: string | null
  url: string | null
  subreddit: {
    name: string
    displayName: string
  }
  analytics?: {
    upvotes: number
    commentCount: number
    score: number
  }
}

interface HeatmapCell {
  dayOfWeek: number
  hourOfDay: number
  engagementRate: number
  normalizedEngagement: number
  avgScore: number
  avgComments: number
  sampleSize: number
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  // Optimal Times state
  const [subredditName, setSubredditName] = useState('')
  const [timingLoading, setTimingLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [heatmapData, setHeatmapData] = useState<HeatmapCell[]>([])
  const [analyzed, setAnalyzed] = useState(false)
  const [timingError, setTimingError] = useState<string | null>(null)

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const hours = Array.from({ length: 24 }, (_, i) => i)

  useEffect(() => {
    fetchPosts()
  }, [filter])

  async function fetchPosts() {
    try {
      setLoading(true)
      const url = filter === 'all'
        ? '/api/posts'
        : `/api/posts?status=${filter}`
      const response = await fetch(url)
      const data = await response.json()
      setPosts(data.posts || [])
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAnalyze() {
    if (!subredditName) {
      setTimingError('Please enter a subreddit name')
      return
    }

    setAnalyzing(true)
    setTimingError(null)

    try {
      const response = await fetch('/api/timing/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subredditName, limit: 150 }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze timing')
      }

      await fetchHeatmap()
    } catch (error: any) {
      setTimingError(error.message)
      console.error('Error analyzing timing:', error)
    } finally {
      setAnalyzing(false)
    }
  }

  async function fetchHeatmap() {
    if (!subredditName) return

    setTimingLoading(true)
    setTimingError(null)

    try {
      const response = await fetch(`/api/timing/heatmap?subreddit=${subredditName}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch heatmap')
      }

      setAnalyzed(data.analyzed)
      setHeatmapData(data.heatmap || [])
    } catch (error: any) {
      setTimingError(error.message)
      console.error('Error fetching heatmap:', error)
    } finally {
      setTimingLoading(false)
    }
  }

  function getHeatmapColor(normalized: number): string {
    if (normalized >= 0.8) return 'bg-green-600'
    if (normalized >= 0.6) return 'bg-green-500'
    if (normalized >= 0.4) return 'bg-yellow-500'
    if (normalized >= 0.2) return 'bg-orange-500'
    return 'bg-red-500'
  }

  function getCellData(day: number, hour: number): HeatmapCell | undefined {
    return heatmapData.find(cell => cell.dayOfWeek === day && cell.hourOfDay === hour)
  }

  const statusColors = {
    scheduled: 'bg-blue-100 text-blue-800',
    posted: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
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

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Posts & Timing</h1>
            <p className="text-gray-400 mt-1 text-sm sm:text-base">Manage posts and find optimal posting times</p>
          </div>
          <Link
            href="/dashboard"
            className="glass-button text-gray-300 px-4 sm:px-6 py-2 rounded-lg transition text-center sm:text-left"
          >
            ← Back
          </Link>
        </div>

        {/* Posts Section - Compact with scrolling */}
        <div className="feature-card rounded-lg mb-6">
          <div className="border-b border-gray-700">
            <div className="flex justify-between items-center">
              <nav className="flex -mb-px">
                <Link
                  href="/dashboard/drafts"
                  className="px-4 sm:px-6 py-3 text-sm font-medium border-b-2 border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600"
                >
                  Drafts
                </Link>
                {['all', 'scheduled', 'posted', 'failed'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilter(status)}
                    className={`px-4 sm:px-6 py-3 text-sm font-medium border-b-2 ${
                      filter === status
                        ? 'border-reddit-orange text-reddit-orange'
                        : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </nav>
              <Link
                href="/dashboard/new-post"
                className="mr-4 text-sm text-[#00D9FF] hover:text-[#00D9FF]/80 transition"
              >
                + New Post
              </Link>
            </div>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-reddit-orange"></div>
                <p className="text-gray-400 mt-2 text-sm">Loading posts...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-2 text-sm">No posts found</p>
                <Link
                  href="/dashboard/new-post"
                  className="text-reddit-orange hover:underline text-sm"
                >
                  Create your first post
                </Link>
              </div>
            ) : (
              <div className="max-h-[240px] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="border border-gray-700 bg-[#12121a] rounded-lg p-3 hover:border-[#00D9FF] transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-medium text-[#00D9FF]">
                            {post.subreddit.displayName}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[post.status as keyof typeof statusColors]}`}>
                            {post.status}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-white mb-1 line-clamp-1">
                          {post.title}
                        </h3>
                        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                          {post.scheduledAt && (
                            <span>Scheduled: {new Date(post.scheduledAt).toLocaleDateString()}</span>
                          )}
                          {post.postedAt && (
                            <span>Posted: {new Date(post.postedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {post.analytics && (
                          <div className="text-right flex gap-2">
                            <span className="text-xs font-medium text-white">↑ {post.analytics.upvotes}</span>
                            <span className="text-xs text-gray-400">{post.analytics.commentCount} comments</span>
                          </div>
                        )}
                        {post.url && (
                          <a
                            href={post.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-reddit-orange hover:underline whitespace-nowrap"
                          >
                            View →
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Optimal Times Section */}
        <div className="mt-10 mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Optimal Posting Times</h2>
        </div>
        <div className="feature-card rounded-lg p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Subreddit Name
              </label>
              <input
                type="text"
                placeholder="e.g., technology"
                value={subredditName}
                onChange={(e) => setSubredditName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-600 bg-[#12121a] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-500 text-sm"
              />
            </div>
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={handleAnalyze}
                disabled={analyzing || !subredditName}
                className="px-4 sm:px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 font-medium text-sm"
              >
                {analyzing ? 'Analyzing...' : 'Analyze'}
              </button>
              {analyzed && (
                <button
                  onClick={fetchHeatmap}
                  disabled={timingLoading}
                  className="glass-button text-gray-300 px-4 py-2 rounded-lg transition disabled:opacity-50 font-medium text-sm"
                >
                  {timingLoading ? 'Refreshing...' : 'Refresh'}
                </button>
              )}
            </div>
          </div>

          {timingError && (
            <div className="mt-4 bg-red-900/50 border border-red-700 rounded-lg p-3">
              <p className="text-sm text-red-300">{timingError}</p>
            </div>
          )}

          {/* Hint text - shows when not analyzed yet */}
          {!analyzed && !analyzing && (
            <p className="text-gray-400 text-sm mt-4">Enter a subreddit name and click "Analyze" to generate timing insights</p>
          )}

          {/* Loading states inside the card */}
          {analyzing && (
            <div className="mt-6 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <p className="text-gray-400 mt-3">Analyzing r/{subredditName}...</p>
              <p className="text-gray-500 text-sm mt-1">This may take 15-30 seconds</p>
            </div>
          )}

          {timingLoading && !analyzing && (
            <div className="mt-6 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <p className="text-gray-400 mt-3">Loading heatmap data...</p>
            </div>
          )}

          {/* No data message */}
          {heatmapData.length === 0 && analyzed && !analyzing && !timingLoading && (
            <div className="mt-4 text-center">
              <p className="text-gray-400 text-sm">Unable to find enough activity data for r/{subredditName}</p>
            </div>
          )}

          {/* Heatmap Grid - Always shown */}
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {subredditName ? `r/${subredditName} Activity` : 'Subreddit Activity'}
                </h3>
                <p className="text-[10px] text-gray-400">
                  Times in Mountain Time (MT)
                </p>
              </div>
              {heatmapData.length > 0 && subredditName && (
                <Link
                  href={`/dashboard/new-post?subreddit=${subredditName}`}
                  className="px-3 py-1.5 bg-reddit-orange text-white rounded-lg hover:bg-orange-600 transition text-xs"
                >
                  Create Post →
                </Link>
              )}
            </div>

            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                <div className="flex">
                  <div className="w-10"></div>
                  {dayNames.map((day, idx) => (
                    <div key={idx} className="flex-1 text-center font-semibold text-gray-300 text-[10px] py-1">
                      {day}
                    </div>
                  ))}
                </div>

                {hours.map((hour) => (
                  <div key={hour} className="flex">
                    <div className="w-10 flex items-center justify-end pr-1 text-[10px] text-gray-400">
                      {hour.toString().padStart(2, '0')}:00
                    </div>
                    {dayNames.map((_, dayIdx) => {
                      const cellData = getCellData(dayIdx, hour)
                      return (
                        <div
                          key={`${dayIdx}-${hour}`}
                          className="flex-1 p-px"
                        >
                          {cellData ? (
                            <div
                              className={`
                                ${getHeatmapColor(cellData.normalizedEngagement)}
                                rounded-sm cursor-pointer hover:opacity-80 transition
                                h-4 flex items-center justify-center
                              `}
                              title={`${dayNames[dayIdx]} ${hour}:00\nEngagement: ${cellData.engagementRate.toFixed(1)}\nAvg Score: ${cellData.avgScore.toFixed(0)}\nSample Size: ${cellData.sampleSize}`}
                            >
                              <span className="text-white text-[8px] font-semibold">
                                {cellData.engagementRate.toFixed(0)}
                              </span>
                            </div>
                          ) : (
                            <div className="bg-gray-700 rounded-sm h-4"></div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] text-gray-400">Low</span>
              <div className="flex items-center gap-0.5">
                <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                <div className="w-3 h-3 bg-orange-500 rounded-sm"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-sm"></div>
                <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                <div className="w-3 h-3 bg-green-600 rounded-sm"></div>
              </div>
              <span className="text-[10px] text-gray-400">High</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

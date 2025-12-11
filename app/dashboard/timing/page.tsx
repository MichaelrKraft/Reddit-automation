'use client'

import { useState } from 'react'
import Link from 'next/link'
import DashboardNav from '@/components/DashboardNav'

interface HeatmapCell {
  dayOfWeek: number
  hourOfDay: number
  engagementRate: number
  normalizedEngagement: number
  avgScore: number
  avgComments: number
  sampleSize: number
}

export default function TimingDashboard() {
  const [subredditName, setSubredditName] = useState('')
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [heatmapData, setHeatmapData] = useState<HeatmapCell[]>([])
  const [analyzed, setAnalyzed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const hours = Array.from({ length: 24 }, (_, i) => i)

  async function handleAnalyze() {
    if (!subredditName) {
      setError('Please enter a subreddit name')
      return
    }

    setAnalyzing(true)
    setError(null)

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
      setError(error.message)
      console.error('Error analyzing timing:', error)
    } finally {
      setAnalyzing(false)
    }
  }

  async function fetchHeatmap() {
    if (!subredditName) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/timing/heatmap?subreddit=${subredditName}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch heatmap')
      }

      setAnalyzed(data.analyzed)
      setHeatmapData(data.heatmap || [])
    } catch (error: any) {
      setError(error.message)
      console.error('Error fetching heatmap:', error)
    } finally {
      setLoading(false)
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
            <h1 className="text-2xl sm:text-3xl font-bold text-white">⏰ Optimal Posting Times</h1>
            <p className="text-gray-400 mt-1 text-sm sm:text-base">Analyze subreddit activity patterns and find the best times to post (Mountain Time)</p>
          </div>
          <Link
            href="/dashboard"
            className="glass-button text-gray-300 px-4 sm:px-6 py-2 rounded-lg transition text-sm sm:text-base"
          >
            ← Back
          </Link>
        </div>

        <div className="feature-card rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
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
                className="w-full px-4 py-2 border border-gray-600 bg-[#12121a] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-500 text-sm sm:text-base"
              />
            </div>
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={handleAnalyze}
                disabled={analyzing || !subredditName}
                className="px-4 sm:px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 font-medium text-sm sm:text-base"
              >
                {analyzing ? '🔄 Analyzing...' : '🔍 Analyze'}
              </button>
              {analyzed && (
                <button
                  onClick={fetchHeatmap}
                  disabled={loading}
                  className="glass-button text-gray-300 px-4 sm:px-6 py-2 rounded-lg transition disabled:opacity-50 font-medium text-sm sm:text-base"
                >
                  {loading ? '↻ Refreshing...' : '↻ Refresh'}
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-900/50 border border-red-700 rounded-lg p-3">
              <p className="text-sm text-red-300">⚠️ {error}</p>
            </div>
          )}
        </div>

        {analyzing ? (
          <div className="feature-card rounded-lg p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            <p className="text-gray-400 mt-4">Analyzing r/{subredditName}...</p>
            <p className="text-gray-500 text-sm mt-2">This may take 15-30 seconds while we fetch recent posts</p>
          </div>
        ) : loading ? (
          <div className="feature-card rounded-lg p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            <p className="text-gray-400 mt-4">Loading heatmap data...</p>
          </div>
        ) : !analyzed ? (
          <div className="feature-card rounded-lg p-12 text-center">
            <h2 className="text-2xl font-semibold text-white mb-2">No Data Yet</h2>
            <p className="text-gray-400">Enter a subreddit name and click "Analyze" to generate timing insights</p>
          </div>
        ) : heatmapData.length === 0 ? (
          <div className="feature-card rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">🤷</div>
            <h2 className="text-2xl font-semibold text-white mb-2">No Activity Data</h2>
            <p className="text-gray-400">Unable to find enough activity data for r/{subredditName}</p>
          </div>
        ) : (
          <div className="feature-card rounded-lg p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-white mb-2">
                Activity Heatmap for r/{subredditName} (Mountain Time)
              </h2>
              <p className="text-sm text-gray-400">
                Brighter colors indicate higher engagement rates. All times shown in Mountain Time (MT). Click on any cell for details.
              </p>
            </div>

            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                <div className="flex">
                  <div className="w-12"></div>
                  {dayNames.map((day, idx) => (
                    <div key={idx} className="flex-1 text-center font-semibold text-gray-300 text-sm py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {hours.map((hour) => (
                  <div key={hour} className="flex">
                    <div className="w-12 flex items-center justify-end pr-2 text-xs text-gray-400">
                      {hour.toString().padStart(2, '0')}:00
                    </div>
                    {dayNames.map((_, dayIdx) => {
                      const cellData = getCellData(dayIdx, hour)
                      return (
                        <div
                          key={`${dayIdx}-${hour}`}
                          className="flex-1 p-1"
                        >
                          {cellData ? (
                            <div
                              className={`
                                ${getHeatmapColor(cellData.normalizedEngagement)}
                                rounded cursor-pointer hover:opacity-80 transition
                                h-8 flex items-center justify-center
                              `}
                              title={`${dayNames[dayIdx]} ${hour}:00\nEngagement: ${cellData.engagementRate.toFixed(1)}\nAvg Score: ${cellData.avgScore.toFixed(0)}\nAvg Comments: ${cellData.avgComments.toFixed(0)}\nSample Size: ${cellData.sampleSize}`}
                            >
                              <span className="text-white text-xs font-semibold">
                                {cellData.engagementRate.toFixed(0)}
                              </span>
                            </div>
                          ) : (
                            <div className="bg-gray-700 rounded h-8"></div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400">Engagement Level:</span>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-red-500 rounded"></div>
                  <span className="text-xs text-gray-400">Low</span>
                  <div className="w-8 h-8 bg-orange-500 rounded"></div>
                  <div className="w-8 h-8 bg-yellow-500 rounded"></div>
                  <div className="w-8 h-8 bg-green-500 rounded"></div>
                  <div className="w-8 h-8 bg-green-600 rounded"></div>
                  <span className="text-xs text-gray-400">High</span>
                </div>
              </div>

              <Link
                href={`/dashboard/new-post?subreddit=${subredditName}`}
                className="px-4 py-2 bg-reddit-orange text-white rounded-lg hover:bg-orange-600 transition"
              >
                Create Post for r/{subredditName} →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'

interface OptimalTime {
  rank: number
  dayOfWeek: string
  hourOfDay: number
  timeString: string
  confidenceScore: number
  avgEngagement: number
  recommendedTime: string
}

interface OptimalTimingWidgetProps {
  subreddit: string
  onSelectTime?: (time: Date) => void
}

export default function OptimalTimingWidget({ subreddit, onSelectTime }: OptimalTimingWidgetProps) {
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [optimalTimes, setOptimalTimes] = useState<OptimalTime[]>([])
  const [analyzed, setAnalyzed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(true)
  const widgetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (subreddit) {
      fetchOptimalTimes()
    }
  }, [subreddit])

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function fetchOptimalTimes() {
    if (!subreddit) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/timing/optimal?subreddit=${subreddit}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch optimal times')
      }

      setAnalyzed(data.analyzed)
      setOptimalTimes(data.optimalTimes || [])
    } catch (error: any) {
      setError(error.message)
      console.error('Error fetching optimal times:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAnalyze() {
    if (!subreddit) return

    setAnalyzing(true)
    setError(null)

    try {
      const response = await fetch('/api/timing/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subredditName: subreddit, limit: 100 }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze timing')
      }

      await fetchOptimalTimes()
    } catch (error: any) {
      setError(error.message)
      console.error('Error analyzing timing:', error)
    } finally {
      setAnalyzing(false)
    }
  }

  function handleSelectTime(time: string) {
    if (onSelectTime) {
      const selectedTime = new Date(time)
      onSelectTime(selectedTime)
    }
  }

  if (!subreddit || !isOpen) {
    return null
  }

  return (
    <div ref={widgetRef} className="bg-[#12121a] rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            ⏰ Optimal Posting Times
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            AI-powered recommendations for r/{subreddit} (Mountain Time)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="px-4 py-2 bg-[#00D9FF] text-black rounded-lg hover:bg-[#00D9FF]/80 transition disabled:opacity-50 text-sm font-medium"
          >
            {analyzing ? '🔄 Analyzing...' : '🔍 Analyze Now'}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-300">⚠️ {error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#00D9FF]"></div>
          <p className="text-sm text-gray-400 mt-2">Loading optimal times...</p>
        </div>
      ) : !analyzed ? (
        <div className="text-center py-8 bg-[#0a0a0f] rounded-lg border-2 border-dashed border-gray-600">
          <p className="text-gray-300 mb-2">📊 No timing data available yet</p>
          <p className="text-sm text-gray-500">Click "Analyze Now" to generate recommendations</p>
        </div>
      ) : optimalTimes.length === 0 ? (
        <div className="text-center py-8 bg-[#0a0a0f] rounded-lg">
          <p className="text-gray-400">No optimal times found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {optimalTimes.map((time) => (
            <div
              key={time.rank}
              className="bg-[#0a0a0f] rounded-lg p-4 border border-gray-700 hover:border-[#00D9FF]/50 hover:bg-[#0a0a0f]/80 transition cursor-pointer"
              onClick={() => handleSelectTime(time.recommendedTime)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`
                    flex items-center justify-center w-8 h-8 rounded-full font-bold text-white
                    ${time.rank === 1 ? 'bg-yellow-500' : time.rank === 2 ? 'bg-gray-500' : time.rank === 3 ? 'bg-orange-600' : 'bg-[#00D9FF]'}
                  `}>
                    {time.rank}
                  </div>
                  <div>
                    <p className="font-semibold text-white">
                      {time.dayOfWeek} at {time.timeString}
                    </p>
                    <p className="text-sm text-gray-400">
                      Next: {new Date(time.recommendedTime).toLocaleDateString()} at {time.timeString}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium text-[#00D9FF]">
                      {(time.confidenceScore * 100).toFixed(0)}% confidence
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Avg Engagement: {time.avgEngagement.toFixed(1)}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="bg-[#00D9FF]/10 border border-[#00D9FF]/30 rounded-lg p-3 mt-4">
            <p className="text-xs text-[#00D9FF]">
              💡 <strong>Tip:</strong> Click on a time to auto-fill your scheduling form
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

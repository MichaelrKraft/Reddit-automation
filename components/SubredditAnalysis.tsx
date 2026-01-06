'use client'

import { useState } from 'react'

interface SubredditAnalysisProps {
  subreddit: string
}

// Helper to safely render a value that might be an object
function renderValue(value: any): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    // Convert object to readable string
    return Object.entries(value)
      .map(([k, v]) => `${k}: ${v}`)
      .join('. ')
  }
  return String(value)
}

export default function SubredditAnalysis({ subreddit }: SubredditAnalysisProps) {
  const [analysis, setAnalysis] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function analyzeSubreddit() {
    if (!subreddit.trim()) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/analyze-subreddit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subreddit }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to analyze subreddit')
      }

      const data = await response.json()
      if (!data.analysis) {
        throw new Error('No analysis returned')
      }

      setAnalysis(data.analysis)
      setShow(true)
    } catch (err: any) {
      console.error('Analysis failed:', err)
      setError(err.message || 'Failed to analyze subreddit. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!subreddit.trim()) return null

  return (
    <div className="feature-card rounded-lg p-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔍</span>
          <h4 className="font-semibold text-white">Subreddit Insights</h4>
        </div>
        <button
          type="button"
          onClick={analyzeSubreddit}
          disabled={loading}
          className="text-sm bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-4 py-2 rounded-lg hover:bg-[#00D9FF]/30 transition disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : show ? 'Refresh Analysis' : 'Analyze r/' + subreddit}
        </button>
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {show && analysis && (
        <div className="mt-4 space-y-3 text-sm">
          {analysis.tone && (
            <div>
              <strong className="text-gray-300">Community Tone:</strong>
              <p className="text-gray-400 mt-1">{renderValue(analysis.tone)}</p>
            </div>
          )}

          {analysis.dos && analysis.dos.length > 0 && (
            <div>
              <strong className="text-green-400">✓ Do's:</strong>
              <ul className="list-disc list-inside text-gray-400 mt-1">
                {analysis.dos.map((item: any, i: number) => (
                  <li key={i}>{renderValue(item)}</li>
                ))}
              </ul>
            </div>
          )}

          {analysis.donts && analysis.donts.length > 0 && (
            <div>
              <strong className="text-red-400">✗ Don'ts:</strong>
              <ul className="list-disc list-inside text-gray-400 mt-1">
                {analysis.donts.map((item: any, i: number) => (
                  <li key={i}>{renderValue(item)}</li>
                ))}
              </ul>
            </div>
          )}

          {analysis.styleGuide && (
            <div>
              <strong className="text-gray-300">Style Guide:</strong>
              <p className="text-gray-400 mt-1">{renderValue(analysis.styleGuide)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

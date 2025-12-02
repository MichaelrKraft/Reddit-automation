'use client'

import { useState } from 'react'

interface SubredditAnalysisProps {
  subreddit: string
}

export default function SubredditAnalysis({ subreddit }: SubredditAnalysisProps) {
  const [analysis, setAnalysis] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState(false)

  async function analyzeSubreddit() {
    if (!subreddit.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/ai/analyze-subreddit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subreddit }),
      })

      const data = await response.json()
      setAnalysis(data.analysis)
      setShow(true)
    } catch (error) {
      console.error('Analysis failed:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!subreddit.trim()) return null

  return (
    <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔍</span>
          <h4 className="font-semibold text-gray-900">Subreddit Insights</h4>
        </div>
        <button
          type="button"
          onClick={analyzeSubreddit}
          disabled={loading}
          className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : show ? 'Refresh Analysis' : 'Analyze r/' + subreddit}
        </button>
      </div>

      {show && analysis && (
        <div className="mt-4 space-y-3 text-sm">
          {analysis.tone && (
            <div>
              <strong className="text-gray-700">Community Tone:</strong>
              <p className="text-gray-600 mt-1">{analysis.tone}</p>
            </div>
          )}

          {analysis.dos && analysis.dos.length > 0 && (
            <div>
              <strong className="text-green-700">✓ Do's:</strong>
              <ul className="list-disc list-inside text-gray-600 mt-1">
                {analysis.dos.map((item: string, i: number) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {analysis.donts && analysis.donts.length > 0 && (
            <div>
              <strong className="text-red-700">✗ Don'ts:</strong>
              <ul className="list-disc list-inside text-gray-600 mt-1">
                {analysis.donts.map((item: string, i: number) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {analysis.styleGuide && (
            <div>
              <strong className="text-gray-700">Style Guide:</strong>
              <p className="text-gray-600 mt-1">{analysis.styleGuide}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

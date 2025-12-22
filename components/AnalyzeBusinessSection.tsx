'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Analysis {
  id: string
  url: string
  businessName: string
  businessType: string
  description: string
  targetAudience: { segment: string; description: string }[]
  painPoints: { pain: string; howToAddress: string }[]
  subreddits: { name: string; subscribers?: string; relevance: number; reason: string }[]
  keywords: string[]
  createdAt: string
}

export default function AnalyzeBusinessSection() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [error, setError] = useState('')

  async function analyzeUrl() {
    if (!url.trim()) return

    setLoading(true)
    setError('')
    setAnalysis(null)

    try {
      const response = await fetch('/api/analyze-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze')
      }

      setAnalysis(data.analysis)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function addToKeywordAlerts(keyword: string) {
    try {
      const response = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', keyword }),
      })

      if (response.ok) {
        alert(`Added "${keyword}" to Keyword Alerts!`)
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to add keyword')
      }
    } catch (err) {
      alert('Failed to add keyword')
    }
  }

  return (
    <div className="mt-8">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">
          Analyze Your Business
        </h2>
        <p className="text-gray-400 text-sm max-w-xl mx-auto">
          Enter your website URL. AI analyzes your business and identifies the best subreddits,
          target audience, and pain points to target.
        </p>
      </div>

      {/* URL Input */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="feature-card rounded-xl p-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && analyzeUrl()}
              placeholder="Enter your website URL (e.g., myproduct.com)"
              className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500"
              disabled={loading}
            />
            <button
              onClick={analyzeUrl}
              disabled={loading || !url.trim()}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-lg transition disabled:opacity-50 font-semibold whitespace-nowrap"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span> Analyzing...
                </span>
              ) : (
                '🔍 Analyze'
              )}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-red-400 text-sm">{error}</p>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500 mb-3"></div>
          <p className="text-gray-400">Analyzing your business...</p>
          <p className="text-gray-500 text-sm mt-1">This usually takes 15-30 seconds</p>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && !loading && (
        <div className="space-y-4 animate-fadeIn max-w-4xl mx-auto">
          {/* Business Overview */}
          <div className="feature-card rounded-xl p-4">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h3 className="text-xl font-bold text-white">{analysis.businessName}</h3>
                <span className="inline-block px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full text-xs mt-1">
                  {analysis.businessType}
                </span>
              </div>
              <a
                href={analysis.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-xs"
              >
                {analysis.url} ↗
              </a>
            </div>
            <p className="text-gray-300 text-sm">{analysis.description}</p>
          </div>

          {/* Target Audience */}
          <div className="feature-card rounded-xl p-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              👥 Target Audience
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {analysis.targetAudience.map((audience, idx) => (
                <div key={idx} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                  <h4 className="font-medium text-white text-sm mb-1">{audience.segment}</h4>
                  <p className="text-gray-400 text-xs">{audience.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pain Points */}
          <div className="feature-card rounded-xl p-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              🎯 Pain Points to Target
            </h3>
            <div className="space-y-3">
              {analysis.painPoints.map((point, idx) => (
                <div key={idx} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                  <div className="flex items-start gap-2">
                    <span className="text-red-400 text-sm">⚠️</span>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium mb-1">{point.pain}</p>
                      <p className="text-green-400 text-xs">
                        <span className="text-gray-500">How to address:</span> {point.howToAddress}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Subreddits */}
          <div className="feature-card rounded-xl p-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              📍 Recommended Subreddits
            </h3>
            <p className="text-gray-400 text-xs mb-3">
              Click a subreddit to create a post targeting that community
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {analysis.subreddits
                .sort((a, b) => b.relevance - a.relevance)
                .map((sub, idx) => (
                  <div key={idx} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700 hover:border-blue-500/50 transition">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <Link
                        href={`/dashboard/new-post?subreddit=${sub.name}`}
                        className="text-blue-400 hover:text-blue-300 font-medium text-sm"
                      >
                        r/{sub.name} →
                      </Link>
                      <div className="flex items-center gap-2">
                        {sub.subscribers && (
                          <span className="text-xs text-gray-500">{sub.subscribers}</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          sub.relevance >= 8 ? 'bg-green-500/20 text-green-400' :
                          sub.relevance >= 6 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {sub.relevance}/10
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-400 text-xs">{sub.reason}</p>
                  </div>
                ))}
            </div>
          </div>

          {/* Keywords to Monitor */}
          <div className="feature-card rounded-xl p-4">
            <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              🔑 Keywords to Monitor
            </h3>
            <p className="text-gray-400 text-xs mb-3">
              Click to add to Keyword Alerts and get notified when someone mentions these terms.
            </p>
            <div className="flex flex-wrap gap-2">
              {analysis.keywords.map((keyword, idx) => (
                <button
                  key={idx}
                  onClick={() => addToKeywordAlerts(keyword)}
                  className="px-3 py-1.5 bg-green-900/30 hover:bg-green-900/50 border border-green-500/50 text-green-400 rounded-lg text-xs transition group"
                >
                  <span>{keyword}</span>
                  <span className="ml-1 opacity-0 group-hover:opacity-100 transition">+</span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <Link
              href="/dashboard/keyword-alerts"
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition font-medium text-sm"
            >
              → Set Up Keyword Alerts
            </Link>
            <Link
              href="/dashboard/speed-alerts"
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition font-medium text-sm"
            >
              → Monitor Subreddits
            </Link>
            <button
              onClick={() => { setAnalysis(null); setUrl(''); }}
              className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition text-sm"
            >
              Analyze Another
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

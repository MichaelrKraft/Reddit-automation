'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import DashboardNav from '@/components/DashboardNav'

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

export default function AnalyzeBusinessPage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [error, setError] = useState('')
  const [previousAnalyses, setPreviousAnalyses] = useState<Analysis[]>([])
  const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null)

  useEffect(() => {
    fetchPreviousAnalyses()
  }, [])

  async function fetchPreviousAnalyses() {
    try {
      const response = await fetch('/api/analyze-business')
      const data = await response.json()
      setPreviousAnalyses(data.analyses || [])
    } catch (err) {
      console.error('Failed to fetch previous analyses:', err)
    }
  }

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
      fetchPreviousAnalyses()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function copyKeyword(keyword: string) {
    navigator.clipboard.writeText(keyword)
    setCopiedKeyword(keyword)
    setTimeout(() => setCopiedKeyword(null), 2000)
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
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      <div className="dot-grid-background">
        <div className="dot-grid-container">
          <div className="dot-grid"></div>
          <div className="dot-grid-overlay"></div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardNav />

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            🎯 Analyze Your Business
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Enter your website URL. AI analyzes your business and identifies the best subreddits,
            target audience, and pain points to target in under 1 minute.
          </p>
        </div>

        {/* URL Input */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="feature-card rounded-xl p-6">
            <div className="flex gap-3">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !loading && analyzeUrl()}
                placeholder="Enter your website URL (e.g., myproduct.com)"
                className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 text-lg"
                disabled={loading}
              />
              <button
                onClick={analyzeUrl}
                disabled={loading || !url.trim()}
                className="px-8 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-lg transition disabled:opacity-50 font-semibold text-lg whitespace-nowrap"
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
              <p className="mt-3 text-red-400 text-sm">{error}</p>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
            <p className="text-gray-400 text-lg">Analyzing your business...</p>
            <p className="text-gray-500 text-sm mt-2">This usually takes 15-30 seconds</p>
          </div>
        )}

        {/* Analysis Results */}
        {analysis && !loading && (
          <div className="space-y-6 animate-fadeIn">
            {/* Business Overview */}
            <div className="feature-card rounded-xl p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">{analysis.businessName}</h2>
                  <span className="inline-block px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm mt-2">
                    {analysis.businessType}
                  </span>
                </div>
                <a
                  href={analysis.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  {analysis.url} ↗
                </a>
              </div>
              <p className="text-gray-300">{analysis.description}</p>
            </div>

            {/* Target Audience */}
            <div className="feature-card rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                👥 Target Audience
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.targetAudience.map((audience, idx) => (
                  <div key={idx} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                    <h4 className="font-medium text-white mb-2">{audience.segment}</h4>
                    <p className="text-gray-400 text-sm">{audience.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pain Points */}
            <div className="feature-card rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                🎯 Pain Points to Target
              </h3>
              <div className="space-y-4">
                {analysis.painPoints.map((point, idx) => (
                  <div key={idx} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-start gap-3">
                      <span className="text-red-400 text-lg">⚠️</span>
                      <div className="flex-1">
                        <p className="text-white font-medium mb-2">{point.pain}</p>
                        <p className="text-green-400 text-sm">
                          <span className="text-gray-500">How to address:</span> {point.howToAddress}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Subreddits */}
            <div className="feature-card rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                📍 Recommended Subreddits
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.subreddits
                  .sort((a, b) => b.relevance - a.relevance)
                  .map((sub, idx) => (
                    <div key={idx} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <a
                          href={`https://reddit.com/r/${sub.name}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 font-medium"
                        >
                          r/{sub.name}
                        </a>
                        <div className="flex items-center gap-2">
                          {sub.subscribers && (
                            <span className="text-xs text-gray-500">{sub.subscribers}</span>
                          )}
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            sub.relevance >= 8 ? 'bg-green-500/20 text-green-400' :
                            sub.relevance >= 6 ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {sub.relevance}/10
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm">{sub.reason}</p>
                    </div>
                  ))}
              </div>
            </div>

            {/* Keywords to Monitor */}
            <div className="feature-card rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                🔑 Keywords to Monitor
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Click to add to Keyword Alerts and get notified when someone mentions these terms.
              </p>
              <div className="flex flex-wrap gap-2">
                {analysis.keywords.map((keyword, idx) => (
                  <button
                    key={idx}
                    onClick={() => addToKeywordAlerts(keyword)}
                    className="px-4 py-2 bg-green-900/30 hover:bg-green-900/50 border border-green-500/50 text-green-400 rounded-lg text-sm transition group"
                  >
                    <span>{keyword}</span>
                    <span className="ml-2 opacity-0 group-hover:opacity-100 transition">+ Add</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/dashboard/keyword-alerts"
                className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition font-medium"
              >
                → Set Up Keyword Alerts
              </Link>
              <Link
                href="/dashboard/speed-alerts"
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition font-medium"
              >
                → Monitor Subreddits
              </Link>
              <button
                onClick={() => { setAnalysis(null); setUrl(''); }}
                className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition"
              >
                Analyze Another Business
              </button>
            </div>
          </div>
        )}

        {/* Previous Analyses */}
        {!analysis && !loading && previousAnalyses.length > 0 && (
          <div className="mt-12">
            <h3 className="text-xl font-semibold text-white mb-4">Previous Analyses</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {previousAnalyses.map((prev) => (
                <button
                  key={prev.id}
                  onClick={() => setAnalysis(prev)}
                  className="feature-card rounded-lg p-4 text-left hover:border-purple-500/50 transition"
                >
                  <h4 className="font-medium text-white mb-1">{prev.businessName || 'Unknown Business'}</h4>
                  <p className="text-gray-500 text-sm truncate">{prev.url}</p>
                  <p className="text-gray-600 text-xs mt-2">
                    {new Date(prev.createdAt).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

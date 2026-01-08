'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface SEOThread {
  rank: number
  title: string
  url: string
  subreddit: string
  snippet?: string
  commentCount?: number
  upvotes?: number
  postAge?: string
  estimatedTraffic?: number
}

interface SearchHistory {
  id: string
  keyword: string
  resultsCount: number
  searchedAt: string
  threads: SEOThread[]
}

interface GeneratedComment {
  style: 'helpful' | 'curious' | 'supportive'
  text: string
}

export default function SEOFinderPage() {
  const [keyword, setKeyword] = useState('')
  const [threads, setThreads] = useState<SEOThread[]>([])
  const [history, setHistory] = useState<SearchHistory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchesRemaining, setSearchesRemaining] = useState<number | null>(null)
  const [upgradeRequired, setUpgradeRequired] = useState(false)
  const [demoMode, setDemoMode] = useState(false)
  const [generatingComments, setGeneratingComments] = useState<string | null>(null)
  const [generatedComments, setGeneratedComments] = useState<Record<string, GeneratedComment[]>>({})
  const [copiedComment, setCopiedComment] = useState<string | null>(null)

  // Load search history on mount
  useEffect(() => {
    loadHistory()
  }, [])

  async function loadHistory() {
    try {
      const res = await fetch('/api/seo-threads/history')
      const data = await res.json()

      if (data.upgradeRequired) {
        setUpgradeRequired(true)
        return
      }

      if (data.history) {
        setHistory(data.history)
        setSearchesRemaining(data.searchesRemaining)
      }
    } catch (err) {
      console.error('Failed to load history:', err)
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!keyword.trim()) return

    setLoading(true)
    setError(null)
    setThreads([])

    try {
      const res = await fetch('/api/seo-threads/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: keyword.trim() })
      })

      const data = await res.json()

      if (data.upgradeRequired) {
        setUpgradeRequired(true)
        return
      }

      if (data.limitReached) {
        setError(data.error)
        return
      }

      if (data.error) {
        setError(data.error)
        return
      }

      setThreads(data.threads || [])
      setSearchesRemaining(data.searchesRemaining)
      setDemoMode(data.demoMode || false)

      // Refresh history
      loadHistory()
    } catch (err: any) {
      setError(err.message || 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  function formatTraffic(traffic?: number) {
    if (!traffic) return 'N/A'
    if (traffic >= 1000) return `~${(traffic / 1000).toFixed(1)}k`
    return `~${traffic}`
  }

  async function generateComments(thread: SEOThread) {
    const threadKey = thread.url
    setGeneratingComments(threadKey)

    try {
      const res = await fetch('/api/seo-threads/generate-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postTitle: thread.title,
          postUrl: thread.url,
          subreddit: thread.subreddit,
          snippet: thread.snippet
        })
      })

      const data = await res.json()

      if (data.comments) {
        setGeneratedComments(prev => ({
          ...prev,
          [threadKey]: data.comments
        }))
      }
    } catch (err) {
      console.error('Failed to generate comments:', err)
    } finally {
      setGeneratingComments(null)
    }
  }

  function copyComment(text: string, commentId: string) {
    navigator.clipboard.writeText(text)
    setCopiedComment(commentId)
    setTimeout(() => setCopiedComment(null), 2000)
  }

  const styleColors: Record<string, string> = {
    helpful: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/50',
    curious: 'bg-orange-500/10 text-orange-400 border-orange-500/50',
    supportive: 'bg-green-500/10 text-green-400 border-green-500/50',
  }

  if (upgradeRequired) {
    return (
      <>
        <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-xl p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-white mb-2">Lifetime Buyers Only</h2>
          <p className="text-gray-400 mb-6">
            SEO Thread Finder is an exclusive feature for lifetime deal holders.
            Find Reddit threads that are already ranking on Google and capture that traffic.
          </p>
          <a
            href="/dashboard"
            className="inline-block px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg font-semibold text-white hover:from-purple-600 hover:to-blue-600 transition"
          >
            Get Lifetime Deal - $29
          </a>
        </div>

        <div className="text-center mt-8">
          <Link href="/" className="text-gray-400 hover:text-white transition">
            ← Back to Home
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      {searchesRemaining !== null && (
        <div className="flex justify-center mb-6">
          <div className="text-sm text-gray-400 bg-gray-800/50 px-3 py-1 rounded-lg">
            {searchesRemaining} searches left today
          </div>
        </div>
      )}

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-3">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="e.g., best project management tool 2024"
            className="flex-1 px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:border-cyan-500 text-white placeholder-gray-500"
          />
          <button
            type="submit"
            disabled={loading || !keyword.trim()}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg font-semibold text-white hover:from-purple-600 hover:to-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '🔍 Searching...' : '🔍 Search'}
          </button>
        </div>
      </form>

      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Demo Mode Banner */}
      {demoMode && threads.length > 0 && (
        <div className="mb-6 p-4 bg-amber-900/30 border border-amber-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧪</span>
            <div>
              <p className="font-semibold text-amber-400">Demo Mode</p>
              <p className="text-sm text-amber-300/80">
                Showing sample data. Add SERPAPI_KEY to your environment for real Google results.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {threads.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            Found {threads.length} Reddit threads ranking for "{keyword}"
            {demoMode && <span className="text-amber-400 text-sm ml-2">(demo)</span>}
          </h2>

          <div className="space-y-4">
            {threads.map((thread, index) => {
              return (
                <div
                  key={index}
                  className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 hover:border-cyan-500/50 transition"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-cyan-400">r/{thread.subreddit}</span>
                    {thread.postAge && (
                      <span className="text-sm text-gray-500">• {thread.postAge}</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-lg text-white mb-2 line-clamp-2">{thread.title}</h3>
                  {thread.snippet && (
                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">{thread.snippet}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    {thread.commentCount !== undefined && (
                      <span className="text-gray-400">
                        💬 {thread.commentCount} comments
                      </span>
                    )}
                    {thread.upvotes !== undefined && (
                      <span className="text-gray-400">
                        ⬆️ {thread.upvotes} upvotes
                      </span>
                    )}
                    <span className="text-green-400 font-medium">
                      📈 {formatTraffic(thread.estimatedTraffic)} monthly visits
                    </span>
                  </div>
                  <div className="flex gap-3 mt-4 pt-4 border-t border-gray-700">
                    <button
                      onClick={() => window.open(thread.url, '_blank', 'noopener,noreferrer')}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium text-white transition"
                    >
                      Open Thread ↗
                    </button>
                    <button
                      onClick={() => generateComments(thread)}
                      disabled={generatingComments === thread.url}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium text-white transition disabled:opacity-50"
                    >
                      {generatingComments === thread.url ? (
                        <span className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Generating...
                        </span>
                      ) : generatedComments[thread.url] ? (
                        'Regenerate Comments'
                      ) : (
                        'Generate Comments'
                      )}
                    </button>
                  </div>

                  {/* Generated Comments Section */}
                  {generatedComments[thread.url] && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs text-gray-400 mb-2">Click a comment to copy & open thread:</p>
                      {generatedComments[thread.url].map((comment) => (
                        <div
                          key={`${thread.url}-${comment.style}`}
                          className={`p-3 rounded border ${styleColors[comment.style]} cursor-pointer hover:opacity-80 transition`}
                          onClick={() => {
                            copyComment(comment.text, `${thread.url}-${comment.style}`)
                            window.open(thread.url, '_blank', 'noopener,noreferrer')
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <span className="text-xs font-semibold uppercase">
                                {comment.style}
                              </span>
                              <p className="text-sm mt-1">{comment.text}</p>
                            </div>
                            <span className="text-xs ml-2 whitespace-nowrap">
                              {copiedComment === `${thread.url}-${comment.style}`
                                ? '✓ Copied!'
                                : 'Click to copy'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <p className="text-sm text-blue-300">
              💡 <strong>Pro tip:</strong> Add a helpful comment mentioning your product to capture traffic from people searching Google. Posts ranking high on Google get continuous traffic for months or years.
            </p>
          </div>
        </div>
      )}

      {/* Search History */}
      {history.length > 0 && !threads.length && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Recent Searches</h2>
          <div className="space-y-3">
            {history.map((search) => (
              <div
                key={search.id}
                className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4 hover:border-gray-600 transition cursor-pointer"
                onClick={() => {
                  setKeyword(search.keyword)
                  setThreads(search.threads)
                }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium text-white">{search.keyword}</span>
                    <span className="text-gray-500 ml-2 text-sm">
                      {search.resultsCount} threads found
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(search.searchedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !threads.length && !history.length && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-white mb-2">Find High-Value Threads</h3>
          <p className="max-w-md mx-auto">
            Search for keywords your customers use. We'll find Reddit threads already ranking on Google - prime opportunities for helpful comments that drive traffic.
          </p>
        </div>
      )}

      <div className="text-center mt-8">
        <Link href="/" className="text-gray-400 hover:text-white transition">
          ← Back to Home
        </Link>
      </div>
    </>
  )
}

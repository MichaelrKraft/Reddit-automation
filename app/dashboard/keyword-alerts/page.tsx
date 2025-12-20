'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import DashboardNav from '@/components/DashboardNav'

interface UserKeyword {
  id: string
  keyword: string
  isActive: boolean
  matchCount: number
  lastCheckedAt: string | null
  _count: { matches: number }
}

interface KeywordMatch {
  id: string
  postTitle: string
  postUrl: string
  postAuthor: string
  subreddit: string
  commentCount: number
  upvotes: number
  aiSuggestions: string | null
  isRead: boolean
  isActedOn: boolean
  matchedAt: string
  keyword: { keyword: string }
}

export default function KeywordAlertsPage() {
  const [keywords, setKeywords] = useState<UserKeyword[]>([])
  const [matches, setMatches] = useState<KeywordMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [newKeyword, setNewKeyword] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [showUnreadOnly, setShowUnreadOnly] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [showUnreadOnly])

  async function fetchData() {
    try {
      setLoading(true)
      const [keywordsRes, matchesRes] = await Promise.all([
        fetch('/api/keywords'),
        fetch(`/api/keywords/matches?unreadOnly=${showUnreadOnly}`),
      ])

      const keywordsData = await keywordsRes.json()
      const matchesData = await matchesRes.json()

      setKeywords(keywordsData.keywords || [])
      setMatches(matchesData.matches || [])
      setUnreadCount(keywordsData.unreadCount || 0)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function addKeyword() {
    if (!newKeyword.trim()) return

    try {
      const response = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', keyword: newKeyword }),
      })

      if (response.ok) {
        setNewKeyword('')
        await fetchData()
      } else {
        const data = await response.json()
        alert(data.error)
      }
    } catch (error: any) {
      alert(`Failed: ${error.message}`)
    }
  }

  async function toggleKeyword(keywordId: string) {
    try {
      await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', keywordId }),
      })
      await fetchData()
    } catch (error) {
      console.error('Failed to toggle keyword:', error)
    }
  }

  async function deleteKeyword(keywordId: string) {
    if (!confirm('Delete this keyword and all its matches?')) return

    try {
      await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', keywordId }),
      })
      await fetchData()
    } catch (error) {
      console.error('Failed to delete keyword:', error)
    }
  }

  async function scanNow() {
    try {
      setScanning(true)
      const response = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scan' }),
      })
      const data = await response.json()
      alert(`Scan complete! Found ${data.totalNewMatches || 0} new matches.`)
      await fetchData()
    } catch (error: any) {
      alert(`Scan failed: ${error.message}`)
    } finally {
      setScanning(false)
    }
  }

  async function markAsRead(matchId: string) {
    try {
      await fetch('/api/keywords/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markRead', matchId }),
      })
      setMatches(matches.map(m => m.id === matchId ? { ...m, isRead: true } : m))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  async function markAllRead() {
    try {
      await fetch('/api/keywords/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markAllRead' }),
      })
      await fetchData()
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  function copySuggestion(text: string, matchId: string) {
    navigator.clipboard.writeText(text)
    setCopiedId(matchId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function formatTimeAgo(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
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
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              🔑 Keyword Alerts
              {unreadCount > 0 && (
                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                  {unreadCount} new
                </span>
              )}
            </h1>
            <p className="text-gray-400 mt-1">Monitor Reddit for high-intent keywords</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={scanNow}
              disabled={scanning}
              className="glass-button px-4 py-2 rounded-lg text-white hover:bg-white/10 transition disabled:opacity-50"
            >
              {scanning ? '🔄 Scanning...' : '🔍 Scan Now'}
            </button>
            <Link
              href="/dashboard"
              className="glass-button text-gray-300 px-4 py-2 rounded-lg transition"
            >
              ← Back
            </Link>
          </div>
        </div>

        {/* Add Keyword */}
        <div className="feature-card rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
              placeholder="Enter a keyword (e.g., 'project management tool')"
              className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500"
            />
            <button
              onClick={addKeyword}
              disabled={!newKeyword.trim()}
              className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition disabled:opacity-50"
            >
              + Add Keyword
            </button>
          </div>

          {/* Keywords List */}
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {keywords.map((kw) => (
                <div
                  key={kw.id}
                  className={`flex items-center gap-2 px-3 py-1 rounded-full border ${
                    kw.isActive
                      ? 'bg-green-900/30 border-green-500/50 text-green-400'
                      : 'bg-gray-800 border-gray-600 text-gray-400'
                  }`}
                >
                  <span>{kw.keyword}</span>
                  <span className="text-xs opacity-70">({kw._count.matches})</span>
                  <button
                    onClick={() => toggleKeyword(kw.id)}
                    className="text-xs hover:text-white"
                    title={kw.isActive ? 'Pause' : 'Resume'}
                  >
                    {kw.isActive ? '⏸' : '▶'}
                  </button>
                  <button
                    onClick={() => deleteKeyword(kw.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setShowUnreadOnly(true)}
              className={`px-4 py-2 rounded-lg transition ${
                showUnreadOnly ? 'bg-green-500 text-white' : 'glass-button text-gray-400'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setShowUnreadOnly(false)}
              className={`px-4 py-2 rounded-lg transition ${
                !showUnreadOnly ? 'bg-blue-500 text-white' : 'glass-button text-gray-400'
              }`}
            >
              All Matches
            </button>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-sm text-gray-400 hover:text-white"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Matches List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading matches...</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="feature-card rounded-lg p-12 text-center">
            <p className="text-6xl mb-4">🔍</p>
            <p className="text-gray-400 text-lg">
              {keywords.length === 0
                ? 'Add keywords above to start monitoring Reddit'
                : showUnreadOnly
                ? 'No unread matches. Click "Scan Now" to check for new ones!'
                : 'No matches found yet. Try adding more keywords.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => {
              const suggestions = match.aiSuggestions ? JSON.parse(match.aiSuggestions) : []

              return (
                <div
                  key={match.id}
                  className={`feature-card rounded-lg p-5 ${
                    !match.isRead ? 'border-l-4 border-green-500' : ''
                  }`}
                >
                  {/* Match Header */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                        <span className="text-green-400 font-medium">{match.keyword.keyword}</span>
                        <span>•</span>
                        <span className="text-blue-400">r/{match.subreddit}</span>
                        <span>•</span>
                        <span>{formatTimeAgo(match.matchedAt)}</span>
                        <span>•</span>
                        <span>💬 {match.commentCount}</span>
                        <span>⬆️ {match.upvotes}</span>
                      </div>
                      <h3 className="text-white font-medium">{match.postTitle}</h3>
                      <p className="text-sm text-gray-500">by u/{match.postAuthor}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <a
                        href={match.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => markAsRead(match.id)}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm whitespace-nowrap"
                      >
                        Open Thread →
                      </a>
                    </div>
                  </div>

                  {/* AI Suggestions */}
                  {suggestions.length > 0 && (
                    <div className="mt-4 p-3 bg-purple-900/20 rounded-lg border border-purple-500/30">
                      <p className="text-purple-400 text-xs mb-2">✨ AI Comment Suggestions:</p>
                      <div className="space-y-2">
                        {suggestions.map((suggestion: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-2">
                            <p className="flex-1 text-sm text-gray-300">{suggestion}</p>
                            <button
                              onClick={() => copySuggestion(suggestion, `${match.id}-${idx}`)}
                              className="px-2 py-1 text-xs bg-purple-500 hover:bg-purple-600 text-white rounded"
                            >
                              {copiedId === `${match.id}-${idx}` ? '✓ Copied' : 'Copy'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
// DashboardNav removed - layout provides sidebar

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
  // Phase 1: Intent Classification
  intentType: string | null
  intentScore: number | null
  buyingSignal: boolean
  aiAnalysis: string | null
  // Phase 2: Google Ranking
  googleRank: number | null
  trafficScore: number | null
}

type SortOption = 'newest' | 'oldest' | 'upvotes' | 'comments' | 'keyword' | 'buyingSignal' | 'intentScore' | 'googleRank'

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'buyingSignal', label: '🔥 Buying Signals' },
  { value: 'intentScore', label: '🎯 Intent Score' },
  { value: 'googleRank', label: '📈 Google Rank' },
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'upvotes', label: 'Most Upvotes' },
  { value: 'comments', label: 'Most Comments' },
  { value: 'keyword', label: 'Keyword (A-Z)' },
]

// Intent badge configuration
const INTENT_BADGES: Record<string, { emoji: string; color: string; bgColor: string; label: string }> = {
  BUYING_SIGNAL: { emoji: '🔥', color: 'text-green-400', bgColor: 'bg-green-900/30 border-green-500/50', label: 'Buying Signal' },
  COMPARISON: { emoji: '⚖️', color: 'text-yellow-400', bgColor: 'bg-yellow-900/30 border-yellow-500/50', label: 'Comparison' },
  COMPLAINT: { emoji: '😤', color: 'text-orange-400', bgColor: 'bg-orange-900/30 border-orange-500/50', label: 'Complaint' },
  RECOMMENDATION: { emoji: '👍', color: 'text-blue-400', bgColor: 'bg-blue-900/30 border-blue-500/50', label: 'Recommendation' },
  NEUTRAL: { emoji: '💭', color: 'text-gray-400', bgColor: 'bg-gray-800/30 border-gray-600/50', label: 'Neutral' },
}

export default function KeywordAlertsPage() {
  const [keywords, setKeywords] = useState<UserKeyword[]>([])
  const [matches, setMatches] = useState<KeywordMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [newKeyword, setNewKeyword] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [showUnreadOnly, setShowUnreadOnly] = useState(true)
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [addingPending, setAddingPending] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    fetchData()
  }, [showUnreadOnly])

  // Check for pending keywords from analysis and auto-add them
  useEffect(() => {
    async function addPendingKeywords() {
      const stored = localStorage.getItem('pendingKeywords')
      if (!stored) return

      try {
        const pendingKeywords: string[] = JSON.parse(stored)
        if (pendingKeywords.length === 0) return

        setAddingPending(true)
        setPendingCount(pendingKeywords.length)

        // Add each keyword
        let addedCount = 0
        for (const keyword of pendingKeywords) {
          try {
            const response = await fetch('/api/keywords', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'add', keyword }),
            })
            if (response.ok) {
              addedCount++
            }
          } catch (err) {
            console.error(`Failed to add keyword: ${keyword}`, err)
          }
        }

        // Clear the pending keywords
        localStorage.removeItem('pendingKeywords')

        // Refresh the data
        await fetchData()

        setAddingPending(false)
        if (addedCount > 0) {
          alert(`Added ${addedCount} keywords from your business analysis!`)
        }
      } catch (err) {
        console.error('Failed to process pending keywords:', err)
        localStorage.removeItem('pendingKeywords')
        setAddingPending(false)
      }
    }

    addPendingKeywords()
  }, []) // Run only once on mount

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

  async function deleteMatch(matchId: string) {
    try {
      await fetch(`/api/keywords/matches?id=${matchId}`, {
        method: 'DELETE',
      })
      setMatches(matches.filter(m => m.id !== matchId))
    } catch (error) {
      console.error('Failed to delete match:', error)
    }
  }

  function formatExactTime(dateString: string) {
    return new Date(dateString).toLocaleTimeString()
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

  // Sort matches based on selected option
  const sortedMatches = [...matches].sort((a, b) => {
    switch (sortBy) {
      case 'buyingSignal':
        // Sort by buying signal first, then by intent score
        if (a.buyingSignal && !b.buyingSignal) return -1
        if (!a.buyingSignal && b.buyingSignal) return 1
        return (b.intentScore || 0) - (a.intentScore || 0)
      case 'intentScore':
        return (b.intentScore || 0) - (a.intentScore || 0)
      case 'googleRank':
        // Lower rank is better (1 = top), null values go to bottom
        if (a.googleRank === null && b.googleRank === null) return 0
        if (a.googleRank === null) return 1
        if (b.googleRank === null) return -1
        return a.googleRank - b.googleRank
      case 'newest':
        return new Date(b.matchedAt).getTime() - new Date(a.matchedAt).getTime()
      case 'oldest':
        return new Date(a.matchedAt).getTime() - new Date(b.matchedAt).getTime()
      case 'upvotes':
        return b.upvotes - a.upvotes
      case 'comments':
        return b.commentCount - a.commentCount
      case 'keyword':
        return a.keyword.keyword.localeCompare(b.keyword.keyword)
      default:
        return 0
    }
  })

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      <div className="dot-grid-background">
        <div className="dot-grid-container">
          <div className="dot-grid"></div>
          <div className="dot-grid-overlay"></div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              🔑 Keyword Alerts
              {unreadCount > 0 && (
                <span className="px-3 py-1 bg-[#00D9FF]/20 text-[#00D9FF] rounded-full text-sm">
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
              className="px-4 py-2 bg-[#00D9FF] text-black font-medium rounded-lg hover:bg-[#00D9FF]/80 transition disabled:opacity-50"
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
              className="flex-1 bg-[#12121a] border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-[#00D9FF] focus:ring-1 focus:ring-[#00D9FF]/50"
            />
            <button
              onClick={addKeyword}
              disabled={!newKeyword.trim()}
              className="px-6 py-2 bg-[#00D9FF] hover:bg-[#00D9FF]/80 text-black font-medium rounded-lg transition disabled:opacity-50"
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
                      ? 'bg-[#00D9FF]/10 border-[#00D9FF]/50 text-[#00D9FF]'
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

        {/* Filter Tabs and Sort */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setShowUnreadOnly(true)}
              className={`px-4 py-2 rounded-lg transition ${
                showUnreadOnly ? 'bg-[#00D9FF] text-black font-medium' : 'glass-button text-gray-400'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setShowUnreadOnly(false)}
              className={`px-4 py-2 rounded-lg transition ${
                !showUnreadOnly ? 'bg-[#00D9FF] text-black font-medium' : 'glass-button text-gray-400'
              }`}
            >
              All Matches
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 relative">
              <span className="text-sm text-gray-400">Sort by:</span>
              <div className="relative">
                <button
                  onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 bg-[#12121a] border border-gray-600 text-white rounded-lg hover:border-[#00D9FF] focus:border-[#00D9FF] focus:ring-1 focus:ring-[#00D9FF]/50 text-sm min-w-[140px] justify-between"
                >
                  <span>{sortOptions.find(o => o.value === sortBy)?.label}</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {sortDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setSortDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-1 w-full min-w-[160px] bg-[#1a1a24] border border-gray-600 rounded-lg shadow-xl z-20 overflow-hidden">
                      {sortOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setSortBy(option.value)
                            setSortDropdownOpen(false)
                          }}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-[#00D9FF]/20 transition ${
                            sortBy === option.value
                              ? 'bg-[#00D9FF]/10 text-[#00D9FF]'
                              : 'text-gray-300 hover:text-white'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
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
        </div>

        {/* Matches List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D9FF] mx-auto mb-4"></div>
            <p className="text-gray-400">Loading matches...</p>
          </div>
        ) : sortedMatches.length === 0 ? (
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
            {sortedMatches.map((match) => {
              const suggestions = match.aiSuggestions ? JSON.parse(match.aiSuggestions) : []

              return (
                <div
                  key={match.id}
                  className={`feature-card rounded-lg p-5 ${
                    !match.isRead ? 'border-l-4 border-[#00D9FF]' : ''
                  }`}
                >
                  {/* Match Header */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      {/* Intent Badges Row */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {/* Intent Type Badge */}
                        {match.intentType && INTENT_BADGES[match.intentType] && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${INTENT_BADGES[match.intentType].bgColor} ${INTENT_BADGES[match.intentType].color}`}>
                            {INTENT_BADGES[match.intentType].emoji} {INTENT_BADGES[match.intentType].label}
                            {match.intentScore && (
                              <span className="opacity-70">({match.intentScore}%)</span>
                            )}
                          </span>
                        )}
                        {/* Buying Signal Highlight */}
                        {match.buyingSignal && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gradient-to-r from-green-900/50 to-emerald-900/50 border border-green-400/50 text-green-300 animate-pulse">
                            🎯 High Intent
                          </span>
                        )}
                        {/* Google Rank Badge */}
                        {match.googleRank && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-900/30 border border-purple-500/50 text-purple-400">
                            📈 #{match.googleRank} on Google
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                        <span className="text-[#00D9FF] font-medium">{match.keyword.keyword}</span>
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
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a
                        href={match.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => markAsRead(match.id)}
                        className="px-4 py-2 bg-[#00D9FF] hover:bg-[#00D9FF]/80 text-black font-medium rounded-lg text-sm whitespace-nowrap"
                      >
                        Open Thread →
                      </a>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatExactTime(match.matchedAt)}
                      </span>
                      <button
                        onClick={() => deleteMatch(match.id)}
                        className="text-gray-500 hover:text-red-400 transition p-1 rounded hover:bg-red-500/10"
                        title="Dismiss alert"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
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

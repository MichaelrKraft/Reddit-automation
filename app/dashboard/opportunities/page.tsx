'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface OpportunityEvidence {
  id: string
  postUrl: string
  title: string
  author: string
  subreddit: string
  score: number
  comments: number
  postedAt: string
}

interface Opportunity {
  id: string
  title: string
  category: string
  confidence: number
  opportunityText: string
  status: string
  evidenceCount: number
  trendDirection: string
  createdAt: string
  updatedAt: string
  subreddits: string[]
  evidence: OpportunityEvidence[]
  isBookmarked: boolean
  isTracking: boolean
  isActedOn: boolean
}

interface CategoryFilter {
  name: string
  count: number
}

const CATEGORIES = [
  'Productivity',
  'Business Tools & SaaS',
  'Health & Wellness',
  'Education & Self Improvement',
  'Privacy & Security',
  'Media & Entertainment',
  'Finance & Fintech',
  'Developer Tools',
  'Other',
]

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Productivity': { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/50' },
  'Business Tools & SaaS': { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/50' },
  'Health & Wellness': { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/50' },
  'Education & Self Improvement': { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/50' },
  'Privacy & Security': { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50' },
  'Media & Entertainment': { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/50' },
  'Finance & Fintech': { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/50' },
  'Developer Tools': { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/50' },
  'Other': { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/50' },
}

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [subredditInput, setSubredditInput] = useState('')

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedSubreddit, setSelectedSubreddit] = useState<string>('')
  const [sortBy, setSortBy] = useState<string>('newest')
  const [categoryFilters, setCategoryFilters] = useState<CategoryFilter[]>([])
  const [subredditFilters, setSubredditFilters] = useState<CategoryFilter[]>([])

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Load opportunities on mount and when filters change
  useEffect(() => {
    fetchOpportunities()
  }, [selectedCategory, selectedSubreddit, sortBy, page])

  async function fetchOpportunities() {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortBy,
      })

      if (selectedCategory && selectedCategory !== 'all') {
        params.set('category', selectedCategory)
      }
      if (selectedSubreddit) {
        params.set('subreddit', selectedSubreddit)
      }

      const response = await fetch(`/api/opportunities?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch opportunities')
      }

      setOpportunities(data.opportunities || [])
      setTotalPages(data.pagination?.totalPages || 1)
      setTotal(data.pagination?.total || 0)
      setCategoryFilters(data.filters?.categories || [])
      setSubredditFilters(data.filters?.subreddits || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  async function scanSubreddit() {
    if (!subredditInput.trim()) return

    setIsScanning(true)
    setError(null)

    try {
      const response = await fetch('/api/opportunities/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subreddit: subredditInput.trim(),
          limit: 50,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to scan subreddit')
      }

      // Refresh opportunities list
      setPage(1)
      await fetchOpportunities()
      setSubredditInput('')

      // Show success message
      if (data.opportunitiesFound === 0) {
        setError(`Scanned ${data.postsScanned} posts in r/${data.subreddit} - no opportunities found`)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsScanning(false)
    }
  }

  async function handleAction(opportunityId: string, action: string) {
    try {
      const response = await fetch(`/api/opportunities/${opportunityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      if (response.ok) {
        // Update local state
        setOpportunities(prev =>
          prev.map(opp => {
            if (opp.id === opportunityId) {
              if (action === 'bookmark') {
                return { ...opp, isBookmarked: !opp.isBookmarked }
              }
              if (action === 'track') {
                return { ...opp, isTracking: true, status: 'TRACKING' }
              }
              if (action === 'archive') {
                return { ...opp, status: 'ARCHIVED' }
              }
              if (action === 'acted') {
                return { ...opp, isActedOn: true, status: 'ACTED_ON' }
              }
            }
            return opp
          })
        )
      }
    } catch (err) {
      console.error('Failed to perform action:', err)
    }
  }

  async function removeSubreddit(subredditName: string) {
    if (!confirm(`Remove all opportunities from r/${subredditName}?`)) return

    try {
      const response = await fetch(`/api/opportunities/subreddit/${encodeURIComponent(subredditName)}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Clear selection if this subreddit was selected
        if (selectedSubreddit === subredditName) {
          setSelectedSubreddit('')
        }
        // Refresh the list
        setPage(1)
        await fetchOpportunities()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to remove subreddit')
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  function formatTimeAgo(dateStr: string): string {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 30) return `${Math.floor(diffDays / 30)}mo ago`
    if (diffDays > 0) return `${diffDays}d ago`
    if (diffHours > 0) return `${diffHours}h ago`
    if (diffMins > 0) return `${diffMins}m ago`
    return 'Just now'
  }

  function formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  function getCategoryStyle(category: string) {
    return CATEGORY_COLORS[category] || CATEGORY_COLORS['Other']
  }

  return (
    <>
      {/* Info Panel */}
      <div className="mb-6 p-4 bg-[#0a0a12] border-2 border-[#00D9FF] rounded-lg shadow-[0_0_20px_rgba(0,217,255,0.5),0_0_40px_rgba(0,217,255,0.2)]">
        <div className="flex items-start gap-3">
          <span className="text-lg">🔍</span>
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">How It Works</h3>
            <p className="text-xs text-gray-400">
              AI scans Reddit posts for product opportunities - users asking for recommendations, expressing frustrations, or describing unmet needs.
              Each post is analyzed and transformed into actionable business insights.
            </p>
          </div>
        </div>
      </div>

      {/* Scan Subreddit Input */}
      <div className="feature-card rounded-lg p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex gap-2">
            <span className="text-gray-400 self-center">r/</span>
            <input
              type="text"
              placeholder="Enter subreddit to scan (e.g., startups, SaaS, entrepreneur)"
              value={subredditInput}
              onChange={(e) => setSubredditInput(e.target.value.replace(/^r\//, ''))}
              onKeyDown={(e) => e.key === 'Enter' && scanSubreddit()}
              className="flex-1 px-4 py-3 border border-gray-600 bg-[#12121a] rounded-lg focus:ring-2 focus:ring-[#00D9FF] focus:border-transparent text-white placeholder-gray-500"
            />
          </div>
          <button
            onClick={scanSubreddit}
            disabled={isScanning || !subredditInput.trim()}
            className="bg-gradient-to-r from-[#00D9FF] to-cyan-600 text-white px-6 sm:px-8 py-3 rounded-lg hover:opacity-90 transition disabled:opacity-50 font-medium"
          >
            {isScanning ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                Scanning...
              </span>
            ) : (
              'Scan for Opportunities'
            )}
          </button>
        </div>

        {/* Active Subreddits Display */}
        {subredditFilters.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-400 font-medium">Active subreddits:</span>
              {subredditFilters.map((sub) => (
                <div
                  key={sub.name}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition ${
                    selectedSubreddit === sub.name
                      ? 'bg-[#00D9FF] text-black'
                      : 'bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/50'
                  }`}
                >
                  <button
                    onClick={() => {
                      setSelectedSubreddit(selectedSubreddit === sub.name ? '' : sub.name)
                      setPage(1)
                    }}
                    className="hover:opacity-80"
                  >
                    r/{sub.name} ({sub.count})
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeSubreddit(sub.name)
                    }}
                    className={`ml-1 hover:opacity-60 ${
                      selectedSubreddit === sub.name ? 'text-black' : 'text-[#00D9FF]'
                    }`}
                    title={`Remove r/${sub.name} opportunities`}
                  >
                    ×
                  </button>
                </div>
              ))}
              {selectedSubreddit && (
                <button
                  onClick={() => { setSelectedSubreddit(''); setPage(1) }}
                  className="px-2 py-1 text-xs text-gray-400 hover:text-white transition"
                >
                  Clear filter
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => { setSelectedCategory(e.target.value); setPage(1) }}
          className="px-4 py-2 border border-gray-600 bg-[#12121a] rounded-lg text-white text-sm"
        >
          <option value="all">All Categories ({total})</option>
          {categoryFilters.map(cat => (
            <option key={cat.name} value={cat.name}>
              {cat.name} ({cat.count})
            </option>
          ))}
        </select>

        {/* Sort By */}
        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value); setPage(1) }}
          className="px-4 py-2 border border-gray-600 bg-[#12121a] rounded-lg text-white text-sm"
        >
          <option value="newest">Newest First</option>
          <option value="confidence">Highest Confidence</option>
          <option value="upvotes">Highest Upvotes</option>
          <option value="comments">Highest Comments</option>
          <option value="evidence">Most Evidence</option>
          <option value="oldest">Oldest First</option>
        </select>

        {/* Stats */}
        <div className="ml-auto text-sm text-gray-400 self-center">
          {total} opportunities found
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D9FF] mx-auto mb-4"></div>
          <p className="text-gray-400">Loading opportunities...</p>
        </div>
      )}

      {/* Opportunities Grid */}
      {!isLoading && opportunities.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {opportunities.map((opp) => (
            <OpportunityCard
              key={opp.id}
              opportunity={opp}
              onAction={handleAction}
              formatTimeAgo={formatTimeAgo}
              formatNumber={formatNumber}
              getCategoryStyle={getCategoryStyle}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && opportunities.length === 0 && !error && (
        <div className="text-center py-12">
          <span className="text-6xl mb-4 block">💡</span>
          <h3 className="text-xl font-semibold text-white mb-2">
            No Opportunities Yet
          </h3>
          <p className="text-gray-400 max-w-md mx-auto">
            Enter a subreddit above and click &quot;Scan for Opportunities&quot; to discover product ideas hidden in Reddit posts.
          </p>
          <p className="text-gray-500 text-sm mt-4">
            Try: r/startups, r/SaaS, r/entrepreneur, r/smallbusiness
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-600 bg-[#12121a] rounded-lg text-white disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-600 bg-[#12121a] rounded-lg text-white disabled:opacity-50"
          >
            Next
          </button>
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

// Opportunity Card Component
function OpportunityCard({
  opportunity,
  onAction,
  formatTimeAgo,
  formatNumber,
  getCategoryStyle,
}: {
  opportunity: Opportunity
  onAction: (id: string, action: string) => void
  formatTimeAgo: (date: string) => string
  formatNumber: (num: number) => string
  getCategoryStyle: (category: string) => { bg: string; text: string; border: string }
}) {
  const categoryStyle = getCategoryStyle(opportunity.category)
  const mainEvidence = opportunity.evidence[0]

  return (
    <div className="feature-card rounded-lg p-4 hover:border-[#00D9FF]/50 transition group">
      {/* Header: Subreddit + Category */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {opportunity.subreddits.slice(0, 2).map((sub) => (
            <a
              key={sub}
              href={`https://reddit.com/r/${sub}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-400 hover:text-[#00D9FF] transition"
            >
              r/{sub}
            </a>
          ))}
          {opportunity.subreddits.length > 2 && (
            <span className="text-xs text-gray-500">
              +{opportunity.subreddits.length - 2} more
            </span>
          )}
        </div>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${categoryStyle.bg} ${categoryStyle.text} border ${categoryStyle.border}`}
        >
          {opportunity.category}
        </span>
      </div>

      {/* Original Post Title */}
      {mainEvidence && (
        <a
          href={mainEvidence.postUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-white font-medium mb-2 hover:text-[#00D9FF] transition line-clamp-2"
        >
          {mainEvidence.title}
        </a>
      )}

      {/* AI Opportunity Analysis */}
      <div className="bg-[#0a0a12] border-l-4 border-[#00D9FF] rounded-r-lg p-3 mb-3">
        <p className="text-sm text-gray-300 leading-relaxed">
          <span className="text-[#00D9FF] font-semibold">Opportunity: </span>
          {opportunity.opportunityText}
        </p>
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          {mainEvidence && (
            <>
              <span title="Upvotes">⬆️ {formatNumber(mainEvidence.score)}</span>
              <span title="Comments">💬 {mainEvidence.comments}</span>
              <span>{formatTimeAgo(mainEvidence.postedAt)}</span>
            </>
          )}
          <span title="Confidence Score" className="text-[#00D9FF]">
            {opportunity.confidence}% match
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-700/50 opacity-0 group-hover:opacity-100 transition">
        <button
          onClick={() => onAction(opportunity.id, 'bookmark')}
          className={`px-3 py-1.5 rounded text-xs font-medium transition ${
            opportunity.isBookmarked
              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
              : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
          }`}
          title="Bookmark"
        >
          {opportunity.isBookmarked ? '⭐ Saved' : '☆ Save'}
        </button>

        <button
          onClick={() => onAction(opportunity.id, 'track')}
          className={`px-3 py-1.5 rounded text-xs font-medium transition ${
            opportunity.isTracking
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
              : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
          }`}
          title="Track this opportunity"
        >
          {opportunity.isTracking ? '👀 Tracking' : '📌 Track'}
        </button>

        <button
          onClick={() => onAction(opportunity.id, 'acted')}
          className={`px-3 py-1.5 rounded text-xs font-medium transition ${
            opportunity.isActedOn
              ? 'bg-green-500/20 text-green-400 border border-green-500/50'
              : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
          }`}
          title="Mark as acted upon"
        >
          {opportunity.isActedOn ? '✅ Done' : '✓ Act'}
        </button>

        <Link
          href={`/dashboard/new-post?context=${encodeURIComponent(opportunity.opportunityText)}`}
          className="px-3 py-1.5 rounded text-xs font-medium bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/50 hover:bg-[#00D9FF]/30 transition"
          title="Create content based on this opportunity"
        >
          ✏️ Create
        </Link>
      </div>
    </div>
  )
}

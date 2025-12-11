'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import DashboardNav from '@/components/DashboardNav'
import OpportunityCard from '@/components/opportunity-miner/OpportunityCard'
import StatsCard from '@/components/opportunity-miner/StatsCard'
import FilterBar from '@/components/opportunity-miner/FilterBar'
import { useToast, ToastContainer } from '@/components/ui/Toast'

type OpportunityCategory =
  | 'PAIN_POINT'
  | 'FEATURE_REQUEST'
  | 'CONTENT_OPPORTUNITY'
  | 'COMPETITOR_GAP'
  | 'TRENDING_TOPIC'

type OpportunityStatus = 'NEW' | 'TRACKING' | 'ACTED_ON' | 'ARCHIVED'
type TrendDirection = 'GROWING' | 'STABLE' | 'DECLINING'
type SortOption = 'score' | 'recent' | 'evidence' | 'trending'

interface Opportunity {
  id: string
  title: string
  category: OpportunityCategory
  score: number
  problemStatement: string
  evidenceCount: number
  trendDirection: TrendDirection
  status: OpportunityStatus
  firstSeenAt: string
  lastUpdatedAt: string
  earliestPostDate?: string | null
  subreddits?: { subreddit: string; mentionCount: number }[]
}

interface Stats {
  total: number
  newThisWeek: number
  avgScore: number
  byStatus: Record<string, number>
  byCategory: Record<string, number>
  topOpportunities: Opportunity[]
  topSubreddits: { subreddit: string; count: number }[]
}

interface ConfiguredSubreddit {
  id: string
  subreddit: string
  isActive: boolean
  opportunityFrequency: string
  lastOpportunityScan: string | null
}

export default function OpportunityMinerPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isScanning, setIsScanning] = useState(false)

  // Subreddit configuration state
  const [configuredSubreddits, setConfiguredSubreddits] = useState<ConfiguredSubreddit[]>([])
  const [newSubreddit, setNewSubreddit] = useState('')
  const [isAddingSubreddit, setIsAddingSubreddit] = useState(false)
  const [showSetup, setShowSetup] = useState(true)

  // Filter state
  const [category, setCategory] = useState<OpportunityCategory | ''>('')
  const [status, setStatus] = useState<OpportunityStatus | ''>('')
  const [sortBy, setSortBy] = useState<SortOption>('score')
  const [search, setSearch] = useState('')

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const limit = 12

  // Toast notifications
  const { toasts, showToast } = useToast()

  // Retry wrapper for fetch calls
  const fetchWithRetry = async (
    url: string,
    options?: RequestInit,
    retries = 2
  ): Promise<Response> => {
    for (let i = 0; i <= retries; i++) {
      try {
        const response = await fetch(url, options)
        if (!response.ok && response.status >= 500 && i < retries) {
          // Retry on server errors
          await new Promise((r) => setTimeout(r, 1000 * (i + 1)))
          continue
        }
        return response
      } catch (error) {
        if (i === retries) throw error
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)))
      }
    }
    throw new Error('Fetch failed after retries')
  }

  // Validate subreddit name
  const validateSubredditName = (name: string): string | null => {
    const trimmed = name.trim().replace(/^r\//, '')
    if (!trimmed) return null
    if (trimmed.length < 3) return 'Subreddit name must be at least 3 characters'
    if (trimmed.length > 21) return 'Subreddit name must be 21 characters or less'
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) return 'Subreddit name can only contain letters, numbers, and underscores'
    return null
  }

  const fetchOpportunities = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (category) params.append('category', category)
      if (status) params.append('status', status)
      if (search) params.append('search', search)
      params.append('sortBy', sortBy)
      params.append('page', page.toString())
      params.append('limit', limit.toString())

      const response = await fetch(`/api/opportunities?${params.toString()}`)
      const data = await response.json()

      if (data.opportunities) {
        setOpportunities(data.opportunities)
        setTotalPages(data.pagination?.pages || 1)
      }
    } catch (error) {
      console.error('Failed to fetch opportunities:', error)
    } finally {
      setIsLoading(false)
    }
  }, [category, status, sortBy, search, page])

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/opportunities/stats')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }, [])

  const fetchConfiguredSubreddits = useCallback(async () => {
    try {
      const response = await fetch('/api/opportunities/subreddits')
      const data = await response.json()
      if (data.subreddits) {
        setConfiguredSubreddits(data.subreddits)
        // Auto-show setup if no subreddits configured
        if (data.subreddits.length === 0) {
          setShowSetup(true)
        }
      }
    } catch (error) {
      console.error('Failed to fetch configured subreddits:', error)
    }
  }, [])

  const handleAddSubreddit = async () => {
    const subredditName = newSubreddit.trim().replace(/^r\//, '')
    if (!subredditName) return

    // Validate the subreddit name
    const validationError = validateSubredditName(subredditName)
    if (validationError) {
      showToast(validationError, 'error')
      return
    }

    setIsAddingSubreddit(true)
    try {
      const response = await fetchWithRetry('/api/opportunities/subreddits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subreddit: subredditName }),
      })
      const data = await response.json()
      if (response.ok) {
        setNewSubreddit('')
        fetchConfiguredSubreddits()
        showToast(`Added r/${subredditName} to mining list`, 'success')
      } else {
        showToast(data.error || 'Failed to add subreddit', 'error')
      }
    } catch (error) {
      showToast('Failed to add subreddit. Please try again.', 'error')
    } finally {
      setIsAddingSubreddit(false)
    }
  }

  const handleRemoveSubreddit = async (id: string) => {
    try {
      const response = await fetch(`/api/opportunities/subreddits?id=${id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        fetchConfiguredSubreddits()
        showToast('Subreddit removed from mining list', 'success')
      } else {
        showToast('Failed to remove subreddit', 'error')
      }
    } catch (error) {
      showToast('Failed to remove subreddit', 'error')
    }
  }

  useEffect(() => {
    fetchOpportunities()
  }, [fetchOpportunities])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    fetchConfiguredSubreddits()
  }, [fetchConfiguredSubreddits])

  const handleScan = async () => {
    setIsScanning(true)
    showToast('Starting opportunity scan...', 'info')
    try {
      const response = await fetch('/api/opportunities/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ async: false }),
      })
      const data = await response.json()

      if (response.ok) {
        // Refresh data after scan
        await Promise.all([fetchOpportunities(), fetchStats()])
        const found = data.totalOpportunitiesFound || 0
        const updated = data.totalOpportunitiesUpdated || 0
        showToast(`Scan complete! Found ${found} new, updated ${updated} existing`, 'success')
      } else {
        showToast(data.error || 'Scan failed', 'error')
      }
    } catch (error) {
      showToast('Failed to scan subreddits', 'error')
    } finally {
      setIsScanning(false)
    }
  }

  const handleDismiss = async (id: string) => {
    try {
      const response = await fetch(`/api/opportunities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ARCHIVED' }),
      })

      if (response.ok) {
        // Remove from local state immediately for better UX
        setOpportunities((prev) => prev.filter((opp) => opp.id !== id))
        // Refresh stats
        fetchStats()
        showToast('Opportunity archived', 'success')
      } else {
        showToast('Failed to archive opportunity', 'error')
      }
    } catch (error) {
      showToast('Failed to archive opportunity', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} />

      {/* Dot Grid Background */}
      <div className="dot-grid-background">
        <div className="dot-grid-container">
          <div className="dot-grid"></div>
          <div className="dot-grid-overlay"></div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <DashboardNav />

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#00D9FF] to-cyan-400 bg-clip-text text-transparent">
                OPPORTUNITY MINER
              </h1>
              <p className="text-gray-400 mt-1 text-sm sm:text-base">
                Discover market opportunities hidden in Reddit conversations
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSetup(!showSetup)}
                className="glass-button text-gray-300 px-3 sm:px-4 py-2 rounded-lg transition flex items-center gap-2 text-sm sm:text-base"
              >
                <span className="hidden sm:inline">Setup</span>
                <span className="sm:hidden">⚙️</span>
                ({configuredSubreddits.length})
              </button>
              <Link
                href="/dashboard"
                className="glass-button text-gray-300 px-3 sm:px-6 py-2 rounded-lg transition text-sm sm:text-base"
              >
                <span className="hidden sm:inline">← Back</span>
                <span className="sm:hidden">←</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Subreddit Setup Section */}
        {showSetup && (
          <div className="setup-card rounded-xl p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">
                Configure Subreddits for Mining
              </h2>
              <button
                onClick={() => setShowSetup(false)}
                className="text-gray-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {configuredSubreddits.length === 0 ? (
              <p className="text-yellow-400 mb-4 text-sm">
                No subreddits configured. Add at least one subreddit to start mining opportunities.
              </p>
            ) : (
              <p className="text-gray-400 mb-4 text-sm">
                Mining opportunities from {configuredSubreddits.length} subreddit{configuredSubreddits.length !== 1 ? 's' : ''}.
              </p>
            )}

            {/* Add Subreddit Form */}
            <div className="flex gap-2 mb-4">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">r/</span>
                <input
                  type="text"
                  value={newSubreddit}
                  onChange={(e) => setNewSubreddit(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSubreddit()}
                  placeholder="entrepreneur, startups, SaaS..."
                  className="w-full bg-[#1a1a24] border border-gray-700 rounded-lg px-8 py-2 text-white placeholder:text-gray-500 focus:border-[#00D9FF] focus:outline-none"
                />
              </div>
              <button
                onClick={handleAddSubreddit}
                disabled={isAddingSubreddit || !newSubreddit.trim()}
                className="bg-[#00D9FF] text-black font-semibold px-4 py-2 rounded-lg hover:bg-[#00D9FF]/90 transition disabled:opacity-50"
              >
                {isAddingSubreddit ? 'Adding...' : '+ Add'}
              </button>
            </div>

            {/* Configured Subreddits List */}
            {configuredSubreddits.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {configuredSubreddits.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center gap-2 bg-[#1a1a24] border border-gray-700 rounded-lg px-3 py-1.5 text-sm"
                  >
                    <span className="text-[#00D9FF]">r/{sub.subreddit}</span>
                    {sub.lastOpportunityScan && (
                      <span className="text-gray-500 text-xs">
                        Last scan: {new Date(sub.lastOpportunityScan).toLocaleDateString()}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleRemoveSubreddit(sub.id)
                      }}
                      className="text-gray-500 hover:text-red-400 transition ml-1 p-1 cursor-pointer"
                      type="button"
                      aria-label={`Remove r/${sub.subreddit}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard
            title="Total Opportunities"
            value={stats?.total || 0}
          />
          <StatsCard
            title="New This Week"
            value={stats?.newThisWeek || 0}
            trend={
              stats?.total
                ? {
                    value: Math.round(
                      ((stats?.newThisWeek || 0) / stats.total) * 100
                    ),
                    label: 'of total',
                  }
                : undefined
            }
          />
          <StatsCard
            title="Average Score"
            value={stats?.avgScore || 0}
            subtitle="out of 100"
          />
          <StatsCard
            title="Active Tracking"
            value={stats?.byStatus?.TRACKING || 0}
          />
        </div>

        {/* Category Distribution */}
        {stats && stats.byCategory && Object.keys(stats.byCategory).length > 0 && (
          <div className="category-bar rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-white font-semibold">By Category</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byCategory).map(([cat, count]) => (
                <button
                  key={cat}
                  onClick={() =>
                    setCategory(cat === category ? '' : (cat as OpportunityCategory))
                  }
                  className={`px-3 py-1 rounded-full text-sm transition ${
                    category === cat
                      ? 'bg-[#00D9FF] text-black'
                      : 'bg-[#1a1a24] text-gray-300 hover:bg-[#252530]'
                  }`}
                >
                  {cat.replace('_', ' ')} ({count})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <FilterBar
          category={category}
          status={status}
          sortBy={sortBy}
          search={search}
          onCategoryChange={setCategory}
          onStatusChange={setStatus}
          onSortChange={setSortBy}
          onSearchChange={setSearch}
          onScan={handleScan}
          isScanning={isScanning}
        />

        {/* Scanning Progress Indicator */}
        {isScanning && (
          <div className="scan-progress-banner rounded-xl p-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="scan-spinner">
                <svg className="animate-spin h-6 w-6 text-[#00D9FF]" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold">Scanning Subreddits...</h3>
                <p className="text-gray-400 text-sm">
                  Analyzing posts for market opportunities. This may take a minute.
                </p>
              </div>
              <div className="scan-progress-bar w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="scan-progress-fill h-full bg-gradient-to-r from-[#00D9FF] to-cyan-400 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Opportunities Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="opportunity-card rounded-xl p-5 h-64 animate-pulse"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 bg-gray-700 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-700 rounded w-24 mb-2"></div>
                    <div className="h-3 bg-gray-700 rounded w-16"></div>
                  </div>
                </div>
                <div className="h-5 bg-gray-700 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : opportunities.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold text-white mb-2">
              No Opportunities Found
            </h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              {search || category || status
                ? 'Try adjusting your filters or search query'
                : 'Start scanning subreddits to discover market opportunities'}
            </p>
            <button
              onClick={handleScan}
              disabled={isScanning}
              className="bg-gradient-to-r from-[#00D9FF] to-cyan-500 text-black font-semibold px-8 py-3 rounded-lg hover:opacity-90 transition disabled:opacity-50"
            >
              {isScanning ? 'Scanning...' : 'Start Scanning'}
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {opportunities.map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  onDismiss={handleDismiss}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg bg-[#1a1a24] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#252530] transition"
                >
                  ← Previous
                </button>
                <span className="text-gray-400 px-4">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 rounded-lg bg-[#1a1a24] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#252530] transition"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        .opportunity-card {
          background: linear-gradient(
            135deg,
            rgba(0, 217, 255, 0.05) 0%,
            rgba(18, 18, 26, 0.9) 100%
          );
          border: 1px solid rgba(0, 217, 255, 0.2);
          backdrop-filter: blur(12px);
          transition: all 0.3s ease;
        }
        .opportunity-card:hover {
          border-color: rgba(0, 217, 255, 0.5);
          box-shadow: 0 0 30px rgba(0, 217, 255, 0.15);
          transform: translateY(-4px);
        }
        .stats-card {
          background: linear-gradient(
            135deg,
            rgba(0, 217, 255, 0.08) 0%,
            rgba(18, 18, 26, 0.95) 100%
          );
          border: 1px solid rgba(0, 217, 255, 0.15);
        }
        .filter-bar {
          background: rgba(18, 18, 26, 0.8);
          border: 1px solid rgba(0, 217, 255, 0.1);
        }
        .category-bar {
          background: rgba(18, 18, 26, 0.6);
          border: 1px solid rgba(0, 217, 255, 0.1);
        }
        .setup-card {
          background: linear-gradient(
            135deg,
            rgba(147, 51, 234, 0.1) 0%,
            rgba(18, 18, 26, 0.95) 100%
          );
          border: 1px solid rgba(147, 51, 234, 0.3);
        }
        .glass-button {
          background: rgba(18, 18, 26, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .glass-button:hover {
          background: rgba(30, 30, 40, 0.9);
          border-color: rgba(255, 255, 255, 0.2);
        }
        .scan-progress-banner {
          background: linear-gradient(
            135deg,
            rgba(0, 217, 255, 0.1) 0%,
            rgba(18, 18, 26, 0.95) 100%
          );
          border: 1px solid rgba(0, 217, 255, 0.3);
          animation: pulse-border 2s ease-in-out infinite;
        }
        @keyframes pulse-border {
          0%, 100% {
            border-color: rgba(0, 217, 255, 0.3);
            box-shadow: 0 0 10px rgba(0, 217, 255, 0.1);
          }
          50% {
            border-color: rgba(0, 217, 255, 0.6);
            box-shadow: 0 0 20px rgba(0, 217, 255, 0.2);
          }
        }
      `}</style>
    </div>
  )
}

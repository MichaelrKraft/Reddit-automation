'use client'

import { useEffect, useState, useRef } from 'react'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  TrendingUp,
  AlertTriangle,
  Zap,
  MoreVertical,
  Gift,
  Shield,
  XCircle,
  CheckCircle
} from 'lucide-react'

interface User {
  id: string
  clerkId: string
  email: string
  tier: string
  plan: string
  signupNumber: number
  hasLifetimeDeal: boolean
  isAdmin: boolean
  createdAt: string
  lastActive: string | null
  engagementScore?: number
  stats: {
    redditAccounts: number
    posts: number
    drafts: number
    spyAccounts: number
    opportunities: number
    monitoredSubreddits: number
    keywords: number
  }
}

interface UsersResponse {
  users: User[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

interface EngagementUser {
  id: string
  email: string
  engagementScore: number
  redditAccounts: number
  posts: number
}

interface EngagementData {
  summary: {
    averageScore: number
    powerUsersCount: number
    atRiskCount: number
    needsReengagementCount: number
  }
  allUsers: EngagementUser[]
}

// Action dropdown component
function ActionDropdown({
  user,
  onAction
}: {
  user: User
  onAction: (action: string, userId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="p-1 rounded hover:bg-gray-700 transition-colors"
      >
        <MoreVertical className="w-4 h-4 text-gray-400" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-48 bg-[#1a1a24] border border-gray-700 rounded-lg shadow-xl z-50">
          {!user.hasLifetimeDeal ? (
            <button
              onClick={() => {
                onAction('grant_lifetime', user.id)
                setOpen(false)
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-green-400 hover:bg-gray-700/50"
            >
              <Gift className="w-4 h-4" />
              Grant Lifetime Deal
            </button>
          ) : (
            <button
              onClick={() => {
                onAction('revoke_lifetime', user.id)
                setOpen(false)
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-red-400 hover:bg-gray-700/50"
            >
              <XCircle className="w-4 h-4" />
              Revoke Lifetime Deal
            </button>
          )}

          <button
            onClick={() => {
              onAction('toggle_admin', user.id)
              setOpen(false)
            }}
            className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left ${
              user.isAdmin ? 'text-yellow-400' : 'text-blue-400'
            } hover:bg-gray-700/50`}
          >
            <Shield className="w-4 h-4" />
            {user.isAdmin ? 'Remove Admin' : 'Make Admin'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState<string>('')
  const [engagementFilter, setEngagementFilter] = useState<string>('')
  const [page, setPage] = useState(0)
  const limit = 20

  const [engagementData, setEngagementData] = useState<EngagementData | null>(null)
  const [engagementScores, setEngagementScores] = useState<Record<string, number>>({})

  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchUsers()
    fetchEngagement()
  }, [page, tierFilter])

  // Clear action message after 3 seconds
  useEffect(() => {
    if (actionMessage) {
      const timer = setTimeout(() => setActionMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [actionMessage])

  async function fetchUsers() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(page * limit)
      })
      if (search) params.set('search', search)
      if (tierFilter) params.set('tier', tierFilter)

      const response = await fetch(`/api/admin/users?${params}`)
      if (!response.ok) throw new Error('Failed to fetch users')

      const data: UsersResponse = await response.json()
      setUsers(data.users)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  async function fetchEngagement() {
    try {
      const response = await fetch('/api/admin/engagement')
      if (!response.ok) return
      const data: EngagementData = await response.json()
      setEngagementData(data)

      const scores: Record<string, number> = {}
      data.allUsers.forEach(u => {
        scores[u.id] = u.engagementScore
      })
      setEngagementScores(scores)
    } catch (err) {
      console.error('Failed to fetch engagement data:', err)
    }
  }

  async function handleAction(action: string, userId: string) {
    setActionLoading(userId)
    try {
      const response = await fetch('/api/admin/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, targetUserId: userId })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Action failed')
      }

      setActionMessage({ type: 'success', text: result.message })

      // Refresh users to show updated state
      fetchUsers()
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Action failed'
      })
    } finally {
      setActionLoading(null)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(0)
    fetchUsers()
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  function getScoreColor(score: number) {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-blue-400'
    if (score >= 40) return 'text-yellow-400'
    if (score >= 20) return 'text-orange-400'
    return 'text-red-400'
  }

  function getScoreBgColor(score: number) {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-blue-500'
    if (score >= 40) return 'bg-yellow-500'
    if (score >= 20) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const filteredUsers = engagementFilter ? users.filter(user => {
    const score = engagementScores[user.id] || 0
    switch (engagementFilter) {
      case 'high': return score >= 60
      case 'medium': return score >= 30 && score < 60
      case 'low': return score < 30
      default: return true
    }
  }) : users

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      {/* Action Toast */}
      {actionMessage && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
          actionMessage.type === 'success'
            ? 'bg-green-500/20 border border-green-500/30 text-green-400'
            : 'bg-red-500/20 border border-red-500/30 text-red-400'
        }`}>
          {actionMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <XCircle className="w-5 h-5" />
          )}
          {actionMessage.text}
        </div>
      )}

      {/* Engagement Summary Cards */}
      {engagementData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#111118] rounded-xl border border-gray-800 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span className="text-gray-400 text-sm">Avg Score</span>
            </div>
            <p className="text-2xl font-bold text-white">{engagementData.summary.averageScore}</p>
          </div>
          <div className="bg-[#111118] rounded-xl border border-gray-800 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-green-500" />
              <span className="text-gray-400 text-sm">Power Users</span>
            </div>
            <p className="text-2xl font-bold text-green-400">{engagementData.summary.powerUsersCount}</p>
          </div>
          <div className="bg-[#111118] rounded-xl border border-gray-800 p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <span className="text-gray-400 text-sm">At Risk</span>
            </div>
            <p className="text-2xl font-bold text-yellow-400">{engagementData.summary.atRiskCount}</p>
          </div>
          <div className="bg-[#111118] rounded-xl border border-gray-800 p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <span className="text-gray-400 text-sm">Needs Re-engagement</span>
            </div>
            <p className="text-2xl font-bold text-orange-400">{engagementData.summary.needsReengagementCount}</p>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#111118] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
            />
          </div>
        </form>

        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={tierFilter}
            onChange={(e) => {
              setTierFilter(e.target.value)
              setPage(0)
            }}
            className="bg-[#111118] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
          >
            <option value="">All Tiers</option>
            <option value="FOUNDER">Founder</option>
            <option value="ALPHA">Alpha</option>
            <option value="STANDARD">Standard</option>
          </select>

          <select
            value={engagementFilter}
            onChange={(e) => setEngagementFilter(e.target.value)}
            className="bg-[#111118] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
          >
            <option value="">All Engagement</option>
            <option value="high">High (60+)</option>
            <option value="medium">Medium (30-59)</option>
            <option value="low">Low (&lt;30)</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="text-gray-400 text-sm">
        Showing {filteredUsers.length} of {total} users
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      ) : (
        <div className="bg-[#111118] rounded-xl border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">User</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Engagement</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Tier</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Last Active</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Reddit</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Posts</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Features</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium w-12">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const score = engagementScores[user.id] || 0
                  return (
                    <tr
                      key={user.id}
                      className={`border-b border-gray-800 hover:bg-gray-800/30 transition-colors ${
                        actionLoading === user.id ? 'opacity-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="text-white text-sm font-medium">{user.email}</p>
                            <p className="text-gray-500 text-xs">#{user.signupNumber}</p>
                          </div>
                          {user.isAdmin && (
                            <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                              Admin
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getScoreBgColor(score)} transition-all`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                          <span className={`text-sm font-medium ${getScoreColor(score)}`}>
                            {score}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.tier === 'FOUNDER'
                            ? 'bg-orange-500/10 text-orange-500'
                            : user.tier === 'ALPHA'
                            ? 'bg-blue-500/10 text-blue-500'
                            : 'bg-gray-500/10 text-gray-400'
                        }`}>
                          {user.tier}
                        </span>
                        {user.hasLifetimeDeal && (
                          <span className="ml-2 px-2 py-1 rounded text-xs font-medium bg-green-500/10 text-green-500">
                            LTD
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm">
                        {formatDate(user.lastActive)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm ${user.stats.redditAccounts > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                          {user.stats.redditAccounts}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm ${user.stats.posts > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                          {user.stats.posts}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 text-xs">
                          {user.stats.spyAccounts > 0 && (
                            <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-400 rounded">
                              Spy:{user.stats.spyAccounts}
                            </span>
                          )}
                          {user.stats.keywords > 0 && (
                            <span className="px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 rounded">
                              KW:{user.stats.keywords}
                            </span>
                          )}
                          {user.stats.monitoredSubreddits > 0 && (
                            <span className="px-1.5 py-0.5 bg-yellow-500/10 text-yellow-400 rounded">
                              Mon:{user.stats.monitoredSubreddits}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ActionDropdown user={user} onAction={handleAction} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1 px-3 py-1 rounded text-sm text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <span className="text-gray-400 text-sm">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex items-center gap-1 px-3 py-1 rounded text-sm text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Users,
  Activity,
  ExternalLink
} from 'lucide-react'

interface AccountHealthData {
  summary: {
    totalAccounts: number
    activeWarmup: number
    completed: number
    failed: number
    completionRate: number
    failureRate: number
  }
  byPhase: Record<string, number>
  atRiskAccounts: Array<{
    id: string
    username: string
    email: string
    karma: number
    warmupStatus: string
    warmupStartedAt: string
    daysInWarmup: number
  }>
  recentFailures: Array<{
    id: string
    username: string
    email: string
    karma: number
    updatedAt: string
  }>
  shadowbanAlerts: Array<{
    id: string
    title: string
    username: string
    subreddit: string
    postedAt: string
    url: string | null
  }>
  phaseProgression: Array<{
    date: string
    completed: number
  }>
}

const phaseLabels: Record<string, { label: string; color: string }> = {
  NOT_STARTED: { label: 'Not Started', color: 'bg-gray-500' },
  PHASE_1_UPVOTES: { label: 'Phase 1: Upvotes', color: 'bg-blue-500' },
  PHASE_2_COMMENTS: { label: 'Phase 2: Comments', color: 'bg-cyan-500' },
  PHASE_3_POSTS: { label: 'Phase 3: Posts', color: 'bg-purple-500' },
  PHASE_4_MIXED: { label: 'Phase 4: Mixed', color: 'bg-indigo-500' },
  COMPLETED: { label: 'Completed', color: 'bg-green-500' },
  PAUSED: { label: 'Paused', color: 'bg-yellow-500' },
  FAILED: { label: 'Failed', color: 'bg-red-500' }
}

export default function AccountHealthPage() {
  const [data, setData] = useState<AccountHealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const response = await fetch('/api/admin/account-health')
      if (!response.ok) throw new Error('Failed to fetch account health')
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
        <p className="text-red-400">{error}</p>
      </div>
    )
  }

  const totalPhaseAccounts = Object.values(data.byPhase).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#111118] rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-gray-400 text-sm">Total Accounts</span>
          </div>
          <p className="text-2xl font-bold text-white">{data.summary.totalAccounts}</p>
          <p className="text-gray-500 text-sm mt-1">{data.summary.activeWarmup} in warmup</p>
        </div>

        <div className="bg-[#111118] rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <span className="text-gray-400 text-sm">Completed</span>
          </div>
          <p className="text-2xl font-bold text-white">{data.summary.completed}</p>
          <p className="text-green-400 text-sm mt-1">{data.summary.completionRate}% rate</p>
        </div>

        <div className="bg-[#111118] rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <span className="text-gray-400 text-sm">Failed</span>
          </div>
          <p className="text-2xl font-bold text-white">{data.summary.failed}</p>
          <p className="text-red-400 text-sm mt-1">{data.summary.failureRate}% rate</p>
        </div>

        <div className="bg-[#111118] rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            </div>
            <span className="text-gray-400 text-sm">At Risk</span>
          </div>
          <p className="text-2xl font-bold text-white">{data.atRiskAccounts.length}</p>
          <p className="text-yellow-400 text-sm mt-1">Low karma accounts</p>
        </div>
      </div>

      {/* Phase Distribution */}
      <section className="bg-[#111118] rounded-xl border border-gray-800 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-semibold text-white">Phase Distribution</h2>
        </div>

        <div className="space-y-3">
          {Object.entries(data.byPhase).map(([phase, count]) => {
            const percentage = totalPhaseAccounts > 0 ? (count / totalPhaseAccounts) * 100 : 0
            const { label, color } = phaseLabels[phase] || { label: phase, color: 'bg-gray-500' }

            return (
              <div key={phase} className="flex items-center gap-4">
                <div className="w-32 text-sm text-gray-400">{label}</div>
                <div className="flex-1 bg-gray-800 rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-full ${color} transition-all`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="w-16 text-right text-sm text-white font-medium">
                  {count}
                </div>
                <div className="w-12 text-right text-sm text-gray-500">
                  {percentage.toFixed(0)}%
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* At-Risk Accounts */}
        <section className="bg-[#111118] rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-semibold text-white">At-Risk Accounts</h2>
          </div>
          <p className="text-gray-500 text-sm mb-4">Low karma after 14+ days in warmup</p>

          {data.atRiskAccounts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No at-risk accounts</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.atRiskAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between py-2 px-3 bg-yellow-500/5 rounded-lg"
                >
                  <div>
                    <p className="text-white text-sm font-medium">/u/{acc.username}</p>
                    <p className="text-gray-500 text-xs">{acc.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-yellow-400 text-sm font-medium">{acc.karma} karma</p>
                    <p className="text-gray-500 text-xs">{acc.daysInWarmup} days</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Failures */}
        <section className="bg-[#111118] rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <XCircle className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold text-white">Recent Failures</h2>
          </div>
          <p className="text-gray-500 text-sm mb-4">Accounts that failed in the last 7 days</p>

          {data.recentFailures.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No recent failures</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.recentFailures.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between py-2 px-3 bg-red-500/5 rounded-lg"
                >
                  <div>
                    <p className="text-white text-sm font-medium">/u/{acc.username}</p>
                    <p className="text-gray-500 text-xs">{acc.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-red-400 text-sm font-medium">{acc.karma} karma</p>
                    <p className="text-gray-500 text-xs">
                      {new Date(acc.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Shadowban Alerts */}
      <section className="bg-[#111118] rounded-xl border border-gray-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-semibold text-white">Potential Shadowban Alerts</h2>
        </div>
        <p className="text-gray-500 text-sm mb-4">Posts with zero engagement after 24 hours</p>

        {data.shadowbanAlerts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No shadowban alerts</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-2 text-gray-400 text-sm font-medium">Post</th>
                  <th className="text-left px-4 py-2 text-gray-400 text-sm font-medium">Account</th>
                  <th className="text-left px-4 py-2 text-gray-400 text-sm font-medium">Subreddit</th>
                  <th className="text-left px-4 py-2 text-gray-400 text-sm font-medium">Posted</th>
                  <th className="text-left px-4 py-2 text-gray-400 text-sm font-medium">Link</th>
                </tr>
              </thead>
              <tbody>
                {data.shadowbanAlerts.map((post) => (
                  <tr key={post.id} className="border-b border-gray-800 hover:bg-red-500/5">
                    <td className="px-4 py-3">
                      <p className="text-white text-sm truncate max-w-xs">{post.title}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">/u/{post.username}</td>
                    <td className="px-4 py-3 text-gray-400 text-sm">r/{post.subreddit}</td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {post.postedAt ? new Date(post.postedAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      {post.url ? (
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-400 hover:text-orange-300"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 30-Day Completion Trend */}
      <section className="bg-[#111118] rounded-xl border border-gray-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-green-500" />
          <h2 className="text-lg font-semibold text-white">30-Day Completion Trend</h2>
        </div>

        <div className="flex items-end gap-1 h-32">
          {data.phaseProgression.map((day) => {
            const maxCompleted = Math.max(...data.phaseProgression.map(d => d.completed), 1)
            const height = (day.completed / maxCompleted) * 100

            return (
              <div
                key={day.date}
                className="flex-1 group relative"
              >
                <div
                  className="bg-green-500 rounded-t transition-all hover:bg-green-400"
                  style={{ height: `${Math.max(height, 2)}%` }}
                />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 rounded text-xs text-white opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                  {day.date}: {day.completed} completed
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>30 days ago</span>
          <span>Today</span>
        </div>
      </section>
    </div>
  )
}

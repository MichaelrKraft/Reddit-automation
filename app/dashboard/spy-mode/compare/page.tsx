'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import RadarComparison from '@/components/spy-mode/RadarComparison'

interface ComparisonAccount {
  id: string
  username: string
  avatarUrl: string | null
  totalKarma: number
  analytics: {
    avgScore: number
    avgComments: number
    totalPosts: number
    successRate: number
    postsPerWeek: number
    topSubreddits: { name: string; count: number }[]
  }
  radarMetrics: {
    engagement: number
    consistency: number
    volume: number
    successRate: number
    timing: number
    diversity: number
  }
}

interface TableRow {
  metric: string
  account_0?: string | number
  account_1?: string | number
  diff?: string
}

// Wrapper component to handle Suspense boundary for useSearchParams
export default function ComparePage() {
  return (
    <Suspense fallback={<ComparePageLoading />}>
      <ComparePageContent />
    </Suspense>
  )
}

function ComparePageLoading() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D9FF]"></div>
    </div>
  )
}

function ComparePageContent() {
  const searchParams = useSearchParams()
  const ids = searchParams.get('ids')?.split(',') || []

  const [accounts, setAccounts] = useState<ComparisonAccount[]>([])
  const [tableData, setTableData] = useState<TableRow[]>([])
  const [allAccounts, setAllAccounts] = useState<{ id: string; username: string }[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>(ids)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchAllAccounts()
  }, [])

  useEffect(() => {
    if (selectedIds.length >= 2) {
      fetchComparison()
    }
  }, [selectedIds])

  async function fetchAllAccounts() {
    try {
      const response = await fetch('/api/spy-mode/accounts')
      const data = await response.json()
      if (data.accounts) {
        setAllAccounts(data.accounts.map((a: ComparisonAccount) => ({
          id: a.id,
          username: a.username,
        })))

        // If no IDs in URL, select first two
        if (selectedIds.length < 2 && data.accounts.length >= 2) {
          setSelectedIds([data.accounts[0].id, data.accounts[1].id])
        }
      }
    } catch (err) {
      console.error('Failed to fetch accounts:', err)
    }
  }

  async function fetchComparison() {
    if (selectedIds.length < 2) return

    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/spy-mode/compare?ids=${selectedIds.join(',')}`
      )
      const data = await response.json()

      if (data.accounts) {
        setAccounts(data.accounts)
        setTableData(data.tableData)
      }
    } catch (err) {
      console.error('Failed to fetch comparison:', err)
    } finally {
      setIsLoading(false)
    }
  }

  function toggleAccount(id: string) {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 2) {
        setSelectedIds(selectedIds.filter(i => i !== id))
      }
    } else {
      if (selectedIds.length < 4) {
        setSelectedIds([...selectedIds, id])
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      {/* Dot Grid Background */}
      <div className="dot-grid-background">
        <div className="dot-grid-container">
          <div className="dot-grid"></div>
          <div className="dot-grid-overlay"></div>
        </div>
      </div>


      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/spy-mode"
              className="text-gray-400 hover:text-white transition"
            >
              ← Back
            </Link>
            <h1 className="text-2xl font-bold text-white">Compare Accounts</h1>
          </div>
        </div>

        {/* Account Selector */}
        <div className="feature-card rounded-lg p-4 mb-8">
          <p className="text-gray-400 text-sm mb-3">
            Select 2-4 accounts to compare (click to toggle):
          </p>
          <div className="flex flex-wrap gap-2">
            {allAccounts.map((account) => (
              <button
                key={account.id}
                onClick={() => toggleAccount(account.id)}
                className={`px-4 py-2 rounded-lg transition ${
                  selectedIds.includes(account.id)
                    ? 'bg-[#00D9FF] text-black font-semibold'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                u/{account.username}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D9FF]"></div>
          </div>
        ) : accounts.length < 2 ? (
          <div className="text-center py-20">
            <p className="text-gray-400">
              Select at least 2 accounts to compare.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Radar Chart */}
            <div className="feature-card rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                Performance Comparison
              </h2>
              <RadarComparison accounts={accounts} />
            </div>

            {/* Account Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {accounts.map((account, index) => (
                <div key={account.id} className="spy-card rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    {account.avatarUrl ? (
                      <img
                        src={account.avatarUrl}
                        alt={account.username}
                        className="w-12 h-12 rounded-full border-2 border-[#00D9FF]/30"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00D9FF] to-cyan-600 flex items-center justify-center text-black font-bold">
                        {account.username[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="text-white font-semibold">
                        u/{account.username}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {formatKarma(account.totalKarma)} karma
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <MetricItem
                      label="Engagement"
                      value={account.radarMetrics.engagement}
                    />
                    <MetricItem
                      label="Consistency"
                      value={account.radarMetrics.consistency}
                    />
                    <MetricItem
                      label="Volume"
                      value={account.radarMetrics.volume}
                    />
                    <MetricItem
                      label="Success"
                      value={account.radarMetrics.successRate}
                    />
                    <MetricItem
                      label="Timing"
                      value={account.radarMetrics.timing}
                    />
                    <MetricItem
                      label="Diversity"
                      value={account.radarMetrics.diversity}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Metrics Table */}
            <div className="feature-card rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                Side-by-Side Metrics
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">
                        Metric
                      </th>
                      {accounts.map((account) => (
                        <th
                          key={account.id}
                          className="text-right py-3 px-4 text-[#00D9FF] font-medium"
                        >
                          u/{account.username}
                        </th>
                      ))}
                      {accounts.length === 2 && (
                        <th className="text-right py-3 px-4 text-gray-400 font-medium">
                          Diff
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((row, index) => (
                      <tr
                        key={index}
                        className="border-b border-gray-700/50 hover:bg-gray-800/30"
                      >
                        <td className="py-3 px-4 text-gray-300">
                          {row.metric}
                        </td>
                        <td className="py-3 px-4 text-white text-right">
                          {row.account_0}
                        </td>
                        {accounts.length >= 2 && (
                          <td className="py-3 px-4 text-white text-right">
                            {row.account_1}
                          </td>
                        )}
                        {accounts.length === 2 && row.diff && (
                          <td
                            className={`py-3 px-4 text-right font-semibold ${
                              row.diff.startsWith('+')
                                ? 'text-green-400'
                                : 'text-red-400'
                            }`}
                          >
                            {row.diff}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .spy-card {
          background: linear-gradient(135deg, rgba(0, 217, 255, 0.05) 0%, rgba(18, 18, 26, 0.9) 100%);
          border: 1px solid rgba(0, 217, 255, 0.2);
          backdrop-filter: blur(12px);
        }
      `}</style>
    </div>
  )
}

function MetricItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-gray-500 text-xs">{label}</p>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#00D9FF] to-cyan-400 rounded-full"
            style={{ width: `${value}%` }}
          />
        </div>
        <span className="text-white text-sm font-semibold w-8">{value}</span>
      </div>
    </div>
  )
}

function formatKarma(karma: number): string {
  if (karma >= 1000000) return `${(karma / 1000000).toFixed(1)}M`
  if (karma >= 1000) return `${(karma / 1000).toFixed(1)}K`
  return karma.toString()
}

'use client'

import { useEffect, useState } from 'react'
import { BarChart3, TrendingDown, Target, Zap } from 'lucide-react'

interface FeatureUsage {
  feature: string
  path: string
  uniqueUsers: number
  totalViews: number
  firstVisits: number
  adoptionRate: number
}

interface AnalyticsData {
  period: {
    days: number
    since: string
  }
  totalUsers: number
  featureUsage: FeatureUsage[]
  conversionFunnel: {
    dashboardVisitors: number
    redditConnectors: number
    postStarters: number
    postCompletors: number
    dropOff: {
      dashboardToRedditConnect: number
      dashboardToPostStart: number
      postStartToComplete: number
    }
  }
  postCreationAbandonment: Array<{
    lastStep: number | string
    count: number
  }>
}

function FunnelStep({
  label,
  value,
  total,
  dropOff
}: {
  label: string
  value: number
  total: number
  dropOff?: number
}) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0

  return (
    <div className="flex-1">
      <div className="relative">
        <div className="bg-gray-800 rounded-lg h-32 flex items-end overflow-hidden">
          <div
            className="bg-gradient-to-t from-orange-600 to-orange-400 w-full transition-all duration-500"
            style={{ height: `${percentage}%` }}
          />
        </div>
        {dropOff !== undefined && dropOff > 0 && (
          <div className="absolute -right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-1 text-red-400 text-xs">
            <TrendingDown className="w-3 h-3" />
            <span>{dropOff}%</span>
          </div>
        )}
      </div>
      <div className="mt-2 text-center">
        <p className="text-white font-semibold">{value}</p>
        <p className="text-gray-400 text-sm">{label}</p>
        <p className="text-gray-500 text-xs">{percentage}%</p>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(30)

  useEffect(() => {
    fetchAnalytics()
  }, [days])

  async function fetchAnalytics() {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/features?days=${days}`)
      if (!response.ok) throw new Error('Failed to fetch analytics')
      const data = await response.json()
      setData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
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
        <p className="text-red-400">{error || 'Failed to load analytics'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Period Selector */}
      <div className="flex items-center gap-4">
        <span className="text-gray-400">Time Period:</span>
        {[7, 14, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-3 py-1 rounded-lg text-sm ${
              days === d
                ? 'bg-orange-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {d} days
          </button>
        ))}
      </div>

      {/* Conversion Funnel */}
      <section className="bg-[#111118] rounded-xl border border-gray-800 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Target className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-semibold text-white">Conversion Funnel</h2>
        </div>

        <div className="flex gap-8 items-end">
          <FunnelStep
            label="Dashboard Visitors"
            value={data.conversionFunnel.dashboardVisitors}
            total={data.conversionFunnel.dashboardVisitors}
          />
          <FunnelStep
            label="Reddit Connected"
            value={data.conversionFunnel.redditConnectors}
            total={data.conversionFunnel.dashboardVisitors}
            dropOff={data.conversionFunnel.dropOff.dashboardToRedditConnect}
          />
          <FunnelStep
            label="Started Post"
            value={data.conversionFunnel.postStarters}
            total={data.conversionFunnel.dashboardVisitors}
            dropOff={data.conversionFunnel.dropOff.dashboardToPostStart}
          />
          <FunnelStep
            label="Completed Post"
            value={data.conversionFunnel.postCompletors}
            total={data.conversionFunnel.dashboardVisitors}
            dropOff={data.conversionFunnel.dropOff.postStartToComplete}
          />
        </div>
      </section>

      {/* Post Creation Abandonment */}
      {data.postCreationAbandonment.length > 0 && (
        <section className="bg-[#111118] rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold text-white">Post Creation Drop-off Points</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.postCreationAbandonment.map((step) => (
              <div
                key={String(step.lastStep)}
                className="bg-gray-900/50 rounded-lg p-4 text-center"
              >
                <p className="text-2xl font-bold text-red-400">{step.count}</p>
                <p className="text-gray-400 text-sm">
                  Abandoned at Step {step.lastStep}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Feature Usage */}
      <section className="bg-[#111118] rounded-xl border border-gray-800 p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-semibold text-white">Feature Usage</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Feature</th>
                <th className="text-right px-4 py-3 text-gray-400 text-sm font-medium">Unique Users</th>
                <th className="text-right px-4 py-3 text-gray-400 text-sm font-medium">Total Views</th>
                <th className="text-right px-4 py-3 text-gray-400 text-sm font-medium">First Visits</th>
                <th className="text-right px-4 py-3 text-gray-400 text-sm font-medium">Adoption Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.featureUsage.map((feature) => (
                <tr
                  key={feature.feature}
                  className="border-b border-gray-800 hover:bg-gray-800/30"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-white font-medium capitalize">
                        {feature.feature.replace(/-/g, ' ')}
                      </p>
                      <p className="text-gray-500 text-xs">{feature.path}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-white">
                    {feature.uniqueUsers}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400">
                    {feature.totalViews}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {feature.firstVisits > 0 ? (
                      <span className="text-green-400">{feature.firstVisits}</span>
                    ) : (
                      <span className="text-gray-500">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-gray-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-orange-500 h-full transition-all"
                          style={{ width: `${feature.adoptionRate}%` }}
                        />
                      </div>
                      <span className={`text-sm ${
                        feature.adoptionRate > 50 ? 'text-green-400' :
                        feature.adoptionRate > 25 ? 'text-yellow-400' :
                        'text-gray-400'
                      }`}>
                        {feature.adoptionRate}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Quick Insights */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#111118] rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-2 text-orange-500 mb-2">
            <Zap className="w-5 h-5" />
            <span className="font-medium">Top Feature</span>
          </div>
          <p className="text-white text-lg font-semibold capitalize">
            {data.featureUsage[0]?.feature.replace(/-/g, ' ') || 'N/A'}
          </p>
          <p className="text-gray-400 text-sm">
            {data.featureUsage[0]?.uniqueUsers || 0} unique users
          </p>
        </div>

        <div className="bg-[#111118] rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-2 text-red-500 mb-2">
            <TrendingDown className="w-5 h-5" />
            <span className="font-medium">Biggest Drop-off</span>
          </div>
          <p className="text-white text-lg font-semibold">
            Dashboard → Reddit Connect
          </p>
          <p className="text-gray-400 text-sm">
            {data.conversionFunnel.dropOff.dashboardToRedditConnect}% drop-off rate
          </p>
        </div>

        <div className="bg-[#111118] rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-2 text-blue-500 mb-2">
            <Target className="w-5 h-5" />
            <span className="font-medium">Post Completion</span>
          </div>
          <p className="text-white text-lg font-semibold">
            {data.conversionFunnel.postStarters > 0
              ? Math.round((data.conversionFunnel.postCompletors / data.conversionFunnel.postStarters) * 100)
              : 0}%
          </p>
          <p className="text-gray-400 text-sm">
            of users who start posts complete them
          </p>
        </div>
      </section>
    </div>
  )
}

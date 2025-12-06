'use client'

import Link from 'next/link'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface SpyAccount {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  totalKarma: number
  isActive: boolean
  lastChecked: string
  analytics: {
    avgScore: number
    avgComments: number
    totalPosts: number
    successRate: number
    postsPerWeek: number
    topSubreddits: { name: string; count: number }[]
    recentTrend: number[]
  }
  unreadAlerts: number
}

interface SpyCardProps {
  account: SpyAccount
  onRemove: () => void
}

export default function SpyCard({ account, onRemove }: SpyCardProps) {
  const { analytics } = account

  // Prepare sparkline data
  const sparklineData = analytics.recentTrend.map((value, index) => ({
    day: index,
    score: value,
  }))

  // Calculate trend (up/down)
  const trend = analytics.recentTrend.length >= 2
    ? analytics.recentTrend[6] - analytics.recentTrend[0]
    : 0
  const trendPercent = analytics.recentTrend[0] > 0
    ? Math.round((trend / analytics.recentTrend[0]) * 100)
    : 0

  return (
    <div className="spy-card rounded-xl p-6 group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {account.avatarUrl ? (
            <img
              src={account.avatarUrl}
              alt={account.username}
              className="w-12 h-12 rounded-full border-2 border-[#00D9FF]/30"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00D9FF] to-cyan-600 flex items-center justify-center text-black font-bold text-lg">
              {account.username[0].toUpperCase()}
            </div>
          )}
          <div>
            <h3 className="text-white font-semibold text-lg">
              u/{account.username}
            </h3>
            <p className="text-gray-400 text-sm">
              {formatKarma(account.totalKarma)} karma
            </p>
          </div>
        </div>

        {account.unreadAlerts > 0 && (
          <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
            {account.unreadAlerts}
          </div>
        )}
      </div>

      {/* Sparkline */}
      <div className="h-12 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sparklineData}>
            <Line
              type="monotone"
              dataKey="score"
              stroke="#00D9FF"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-gray-500 text-xs">Posts/Week</p>
          <p className="text-white font-semibold">{analytics.postsPerWeek}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Avg Score</p>
          <p className="text-white font-semibold">{formatNumber(analytics.avgScore)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Success</p>
          <p className="text-white font-semibold">{analytics.successRate}%</p>
        </div>
      </div>

      {/* Trend Indicator */}
      <div className="flex items-center gap-2 mb-4">
        <span className={`text-sm font-semibold ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trendPercent)}%
        </span>
        <span className="text-gray-500 text-xs">vs last week</span>
      </div>

      {/* Top Subreddits */}
      {analytics.topSubreddits.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {analytics.topSubreddits.slice(0, 3).map((sub) => (
            <span
              key={sub.name}
              className="text-xs px-2 py-1 bg-[#00D9FF]/10 text-[#00D9FF] border border-[#00D9FF]/30 rounded-full"
            >
              r/{sub.name}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-gray-700/50">
        <Link
          href={`/dashboard/spy-mode/${account.id}`}
          className="flex-1 text-center py-2 text-[#00D9FF] hover:bg-[#00D9FF]/10 rounded-lg transition text-sm font-medium"
        >
          View Profile
        </Link>
        <button
          onClick={(e) => {
            e.preventDefault()
            onRemove()
          }}
          className="px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition text-sm"
        >
          Remove
        </button>
      </div>

      <style jsx>{`
        .spy-card {
          background: linear-gradient(135deg, rgba(0, 217, 255, 0.05) 0%, rgba(18, 18, 26, 0.9) 100%);
          border: 1px solid rgba(0, 217, 255, 0.2);
          backdrop-filter: blur(12px);
          transition: all 0.3s ease;
        }
        .spy-card:hover {
          border-color: rgba(0, 217, 255, 0.5);
          box-shadow: 0 0 30px rgba(0, 217, 255, 0.15);
          transform: translateY(-4px);
        }
      `}</style>
    </div>
  )
}

function formatKarma(karma: number): string {
  if (karma >= 1000000) return `${(karma / 1000000).toFixed(1)}M`
  if (karma >= 1000) return `${(karma / 1000).toFixed(1)}K`
  return karma.toString()
}

function formatNumber(num: number): string {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

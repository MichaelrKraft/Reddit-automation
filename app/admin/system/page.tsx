'use client'

import { useEffect, useState } from 'react'
import {
  Server,
  Database,
  HardDrive,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Clock,
  Zap
} from 'lucide-react'

interface SystemHealthData {
  status: 'healthy' | 'degraded' | 'critical'
  issues: string[]
  uptime: string
  database: {
    connected: boolean
    responseTime: number
  }
  redis: {
    connected: boolean
    error?: string
  }
  queues: {
    posts: {
      waiting: number
      active: number
      completed: number
      failed: number
      delayed: number
    }
    available: boolean
  }
  workers: {
    postsProcessedLastHour: number
    warmupAccounts: Record<string, number>
  }
  recentErrors: Array<{
    id: string
    type: string
    page: string
    message: string
    timestamp: string
  }>
  timestamp: string
}

function StatusBadge({ status }: { status: 'healthy' | 'degraded' | 'critical' }) {
  const config = {
    healthy: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Healthy' },
    degraded: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Degraded' },
    critical: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Critical' }
  }

  const { icon: Icon, color, bg, label } = config[status]

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${bg}`}>
      <Icon className={`w-5 h-5 ${color}`} />
      <span className={`font-semibold ${color}`}>{label}</span>
    </div>
  )
}

function ConnectionCard({
  title,
  icon: Icon,
  connected,
  details,
  error
}: {
  title: string
  icon: React.ElementType
  connected: boolean
  details?: string
  error?: string
}) {
  return (
    <div className="bg-[#111118] rounded-xl border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${connected ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
            <Icon className={`w-5 h-5 ${connected ? 'text-green-500' : 'text-red-500'}`} />
          </div>
          <span className="text-white font-medium">{title}</span>
        </div>
        <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-sm">Status</span>
        <span className={connected ? 'text-green-400' : 'text-red-400'}>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      {details && (
        <div className="flex items-center justify-between mt-2">
          <span className="text-gray-400 text-sm">Response Time</span>
          <span className="text-white">{details}</span>
        </div>
      )}
      {error && (
        <p className="text-red-400 text-sm mt-2">{error}</p>
      )}
    </div>
  )
}

export default function SystemHealthPage() {
  const [data, setData] = useState<SystemHealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  async function fetchData() {
    try {
      setRefreshing(true)
      const response = await fetch('/api/admin/system-health')
      if (!response.ok) throw new Error('Failed to fetch system health')
      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

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
        <button
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <StatusBadge status={data.status} />
          <div className="text-gray-400 text-sm">
            <Clock className="w-4 h-4 inline mr-1" />
            Uptime: {data.uptime}
          </div>
        </div>
        <button
          onClick={fetchData}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Issues Alert */}
      {data.issues.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <span className="text-yellow-500 font-medium">Active Issues</span>
          </div>
          <ul className="list-disc list-inside text-yellow-400 text-sm space-y-1">
            {data.issues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Connection Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ConnectionCard
          title="Database (PostgreSQL)"
          icon={Database}
          connected={data.database.connected}
          details={`${data.database.responseTime}ms`}
        />
        <ConnectionCard
          title="Redis (BullMQ)"
          icon={HardDrive}
          connected={data.redis.connected}
          error={data.redis.error}
        />
      </div>

      {/* Queue Metrics */}
      <section className="bg-[#111118] rounded-xl border border-gray-800 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Server className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-semibold text-white">Queue Status</h2>
          {!data.queues.available && (
            <span className="text-red-400 text-sm">(Unavailable - Redis disconnected)</span>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Waiting', value: data.queues.posts.waiting, color: 'text-blue-400' },
            { label: 'Active', value: data.queues.posts.active, color: 'text-yellow-400' },
            { label: 'Delayed', value: data.queues.posts.delayed, color: 'text-purple-400' },
            { label: 'Completed', value: data.queues.posts.completed, color: 'text-green-400' },
            { label: 'Failed', value: data.queues.posts.failed, color: 'text-red-400' }
          ].map((metric) => (
            <div key={metric.label} className="text-center p-4 bg-gray-900/50 rounded-lg">
              <p className={`text-2xl font-bold ${metric.color}`}>{metric.value}</p>
              <p className="text-gray-400 text-sm mt-1">{metric.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Worker Activity */}
      <section className="bg-[#111118] rounded-xl border border-gray-800 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Zap className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-semibold text-white">Worker Activity</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-gray-400 text-sm mb-3">Posts Processed (Last Hour)</h3>
            <p className="text-3xl font-bold text-white">{data.workers.postsProcessedLastHour}</p>
          </div>

          <div>
            <h3 className="text-gray-400 text-sm mb-3">Warmup Accounts by Status</h3>
            <div className="space-y-2">
              {Object.entries(data.workers.warmupAccounts).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">{status.replace(/_/g, ' ')}</span>
                  <span className="text-white font-medium">{count}</span>
                </div>
              ))}
              {Object.keys(data.workers.warmupAccounts).length === 0 && (
                <p className="text-gray-500 text-sm">No warmup accounts</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Recent Errors */}
      <section className="bg-[#111118] rounded-xl border border-gray-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-semibold text-white">Recent Errors (24h)</h2>
          <span className="text-gray-500 text-sm">({data.recentErrors.length} errors)</span>
        </div>

        {data.recentErrors.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <p className="text-gray-400">No errors in the last 24 hours</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-2 text-gray-400 text-sm font-medium">Time</th>
                  <th className="text-left px-4 py-2 text-gray-400 text-sm font-medium">Type</th>
                  <th className="text-left px-4 py-2 text-gray-400 text-sm font-medium">Page</th>
                  <th className="text-left px-4 py-2 text-gray-400 text-sm font-medium">Message</th>
                </tr>
              </thead>
              <tbody>
                {data.recentErrors.slice(0, 10).map((err) => (
                  <tr key={err.id} className="border-b border-gray-800 hover:bg-red-500/5">
                    <td className="px-4 py-3 text-gray-400 text-sm whitespace-nowrap">
                      {new Date(err.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-red-500/10 text-red-400 text-xs rounded">
                        {err.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{err.page}</td>
                    <td className="px-4 py-3 text-gray-300 text-sm truncate max-w-xs">
                      {err.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Last Updated */}
      <div className="text-center text-gray-500 text-sm">
        Last updated: {new Date(data.timestamp).toLocaleString()}
      </div>
    </div>
  )
}

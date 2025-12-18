'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import SpyCard from '@/components/spy-mode/SpyCard'
import DashboardNav from '@/components/DashboardNav'

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

interface StreamAlert {
  id: string
  accountId: string
  username: string
  alertType: string
  postTitle: string
  postUrl: string
  subreddit: string
  score: number
  createdAt: string
}

export default function SpyModePage() {
  const [accounts, setAccounts] = useState<SpyAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [alerts, setAlerts] = useState<StreamAlert[]>([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const eventSourceRef = useRef<EventSource | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const soundEnabledRef = useRef(true)

  useEffect(() => {
    fetchAccounts()
    audioRef.current = new Audio('/notification.mp3')
  }, [])

  async function fetchAccounts() {
    try {
      const response = await fetch('/api/spy-mode/accounts')
      const data = await response.json()
      if (data.accounts) {
        setAccounts(data.accounts)
      }
    } catch (err) {
      console.error('Failed to fetch spy accounts:', err)
    } finally {
      setIsLoading(false)
    }
  }

  async function addAccount() {
    if (!newUsername.trim()) return

    setIsAdding(true)
    setError(null)

    try {
      const response = await fetch('/api/spy-mode/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to add account')
        return
      }

      // Refresh accounts list
      await fetchAccounts()
      setNewUsername('')
    } catch (err) {
      setError('Failed to add account')
    } finally {
      setIsAdding(false)
    }
  }

  async function removeAccount(id: string) {
    try {
      await fetch(`/api/spy-mode/accounts?id=${id}`, { method: 'DELETE' })
      setAccounts(accounts.filter(a => a.id !== id))
    } catch (err) {
      console.error('Failed to remove account:', err)
    }
  }

  const startMonitoring = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource('/api/spy-mode/stream')
    eventSourceRef.current = eventSource

    eventSource.addEventListener('connected', () => {
      setIsMonitoring(true)
    })

    eventSource.addEventListener('new_post', (event) => {
      const data = JSON.parse(event.data)
      const alert = data.alert as StreamAlert

      // Play notification sound if enabled
      if (soundEnabledRef.current && audioRef.current) {
        audioRef.current.play().catch(() => {})
      }

      // Add to alerts
      setAlerts(prev => [alert, ...prev].slice(0, 10))

      // Show browser notification
      if (Notification.permission === 'granted') {
        new Notification(`New post from u/${alert.username}`, {
          body: alert.postTitle,
          icon: '/reddit-icon.png',
        })
      }
    })

    eventSource.addEventListener('error', () => {
      setIsMonitoring(false)
    })

    eventSource.onerror = () => {
      setIsMonitoring(false)
      eventSource.close()
    }
  }, [])

  const stopMonitoring = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsMonitoring(false)
  }, [])

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
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
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Spy Mode
              </h1>
              <p className="text-gray-400 mt-1 text-sm sm:text-base">
                Track competitors & steal their secrets
              </p>
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-3">
              {isMonitoring ? (
                <button
                  onClick={stopMonitoring}
                  className="bg-red-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-red-700 transition flex items-center gap-2 text-sm sm:text-base"
                >
                  <span className="w-3 h-3 bg-white rounded-full animate-pulse"></span>
                  Stop Monitoring
                </button>
              ) : (
                <button
                  onClick={startMonitoring}
                  disabled={accounts.length === 0}
                  className="bg-[#00D9FF] text-black font-medium px-4 sm:px-6 py-2 rounded-lg hover:bg-[#00D9FF]/80 transition disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  Start Monitoring
                </button>
              )}
              <button
                onClick={() => {
                  setSoundEnabled(!soundEnabled)
                  soundEnabledRef.current = !soundEnabled
                }}
                className={`p-2 rounded-lg transition ${
                  soundEnabled
                    ? 'bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/50'
                    : 'bg-gray-700 text-gray-400 border border-gray-600'
                }`}
                title={soundEnabled ? 'Sound alerts ON - Click to mute' : 'Sound alerts OFF - Click to enable'}
              >
                {soundEnabled ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 3a1 1 0 011.414-.414l14 14a1 1 0 01-1.414 1.414l-1.445-1.445A1 1 0 0116 16H4a1 1 0 01-.707-1.707L4 13.586V8a6 6 0 015.659-5.986L4.414 2.414A1 1 0 014 3zm2 5v.586l8.293 8.293A.996.996 0 0116 16H4.414L6 14.414V8zM10 2a6 6 0 016 6v.586l-2-2V8a4 4 0 00-4-4z" clipRule="evenodd" />
                    <path d="M10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                  </svg>
                )}
              </button>
              <Link
                href="/dashboard"
                className="glass-button text-gray-300 px-4 sm:px-6 py-2 rounded-lg transition text-sm sm:text-base"
              >
                ← Back
              </Link>
            </div>
          </div>

          {/* Add Account Form */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addAccount()}
              placeholder="Enter Reddit username (e.g., u/spez)"
              className="flex-1 sm:max-w-md px-4 py-2 border border-gray-600 bg-[#12121a] rounded-lg focus:ring-2 focus:ring-[#00D9FF] focus:border-transparent text-white placeholder-gray-500 text-sm sm:text-base"
            />
            <button
              onClick={addAccount}
              disabled={isAdding || !newUsername.trim()}
              className="bg-[#00D9FF] text-black font-semibold px-4 sm:px-6 py-2 rounded-lg hover:bg-cyan-400 transition disabled:bg-gray-600 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {isAdding ? 'Adding...' : '+ Add Spy'}
            </button>
          </div>

          {error && (
            <div className="bg-red-900/50 text-red-300 border border-red-700 px-4 py-2 rounded-lg mb-4 max-w-md">
              {error}
            </div>
          )}
        </div>

        {/* Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="spy-card rounded-xl p-6 h-64 animate-pulse"
              >
                <div className="h-4 bg-gray-700 rounded w-1/3 mb-4"></div>
                <div className="h-8 bg-gray-700 rounded w-2/3 mb-6"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-700 rounded w-full"></div>
                  <div className="h-3 bg-gray-700 rounded w-4/5"></div>
                </div>
              </div>
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No Spies Active
            </h3>
            <p className="text-gray-400 mb-6">
              Add a Reddit username above to start tracking competitors
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((account) => (
              <SpyCard
                key={account.id}
                account={account}
                onRemove={() => removeAccount(account.id)}
              />
            ))}
          </div>
        )}

        {/* Recent Activity Feed */}
        {alerts.length > 0 && (
          <div className="mt-8 feature-card rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Recent Activity
            </h2>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 bg-[#1a1a24] border border-[#00D9FF]/30 rounded-lg hover:border-[#00D9FF]/60 transition"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[#00D9FF] font-medium">
                        u/{alert.username}
                      </span>
                      <span className="text-xs text-gray-500">
                        posted in r/{alert.subreddit}
                      </span>
                    </div>
                    <a
                      href={alert.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-[#00D9FF] transition"
                    >
                      {alert.postTitle}
                    </a>
                  </div>
                  <div className="text-sm text-gray-500 ml-4">
                    {new Date(alert.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Compare Button */}
        {accounts.length >= 2 && (
          <div className="mt-8 text-center">
            <Link
              href={`/dashboard/spy-mode/compare?ids=${accounts.slice(0, 2).map(a => a.id).join(',')}`}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-8 py-3 rounded-lg hover:bg-[#00D9FF]/30 transition"
            >
              <span>📊</span>
              Compare Accounts
            </Link>
          </div>
        )}
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

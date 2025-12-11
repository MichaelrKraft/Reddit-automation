'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import DashboardNav from '@/components/DashboardNav'

interface MonitoredSubreddit {
  id: string
  subreddit: string
  isActive: boolean
  lastChecked: string
  alerts: AlertHistory[]
}

interface AlertHistory {
  id: string
  postId: string
  postTitle: string
  postUrl: string
  postAuthor: string
  subreddit: string
  commentOptions: string
  wasActedOn: boolean
  createdAt: string
}

interface GeneratedComment {
  style: 'helpful' | 'curious' | 'supportive'
  text: string
}

interface StreamAlert {
  id: string
  postId: string
  postTitle: string
  postUrl: string
  postAuthor: string
  subreddit: string
  commentOptions: GeneratedComment[]
  wasActedOn?: boolean
  createdAt: string
}

export default function SpeedAlertsPage() {
  const [monitored, setMonitored] = useState<MonitoredSubreddit[]>([])
  const [alerts, setAlerts] = useState<StreamAlert[]>([])
  const [newSubreddit, setNewSubreddit] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedComment, setCopiedComment] = useState<string | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const eventSourceRef = useRef<EventSource | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const soundEnabledRef = useRef(true)

  // Load initial data
  useEffect(() => {
    fetchMonitored()
    fetchAlerts()
  }, [])

  // Initialize audio for notifications
  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3')
  }, [])

  async function fetchMonitored() {
    try {
      const response = await fetch('/api/speed-alerts/monitored')
      const data = await response.json()
      if (data.monitored) {
        setMonitored(data.monitored)
      }
    } catch (err) {
      console.error('Failed to fetch monitored subreddits:', err)
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchAlerts() {
    try {
      const response = await fetch('/api/speed-alerts/alerts?limit=50')
      const data = await response.json()
      if (data.alerts) {
        setAlerts(data.alerts.map((a: AlertHistory) => ({
          ...a,
          commentOptions: JSON.parse(a.commentOptions),
        })))
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err)
    }
  }

  async function addSubreddit() {
    if (!newSubreddit.trim()) return

    setError(null)
    try {
      const response = await fetch('/api/speed-alerts/monitored', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subreddit: newSubreddit.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to add subreddit')
        return
      }

      setMonitored([data.monitored, ...monitored])
      setNewSubreddit('')
    } catch (err) {
      setError('Failed to add subreddit')
    }
  }

  async function removeSubreddit(id: string) {
    try {
      await fetch(`/api/speed-alerts/monitored?id=${id}`, {
        method: 'DELETE',
      })
      setMonitored(monitored.filter((m) => m.id !== id))
    } catch (err) {
      console.error('Failed to remove subreddit:', err)
    }
  }

  const startMonitoring = useCallback(() => {
    console.log('[Speed Alerts UI] Starting monitoring...')

    if (eventSourceRef.current) {
      console.log('[Speed Alerts UI] Closing existing connection')
      eventSourceRef.current.close()
    }

    console.log('[Speed Alerts UI] Creating new EventSource connection')
    const eventSource = new EventSource('/api/speed-alerts/stream')
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      console.log('[Speed Alerts UI] EventSource connection opened')
    }

    eventSource.addEventListener('connected', (event) => {
      console.log('[Speed Alerts UI] Connected event received:', JSON.parse(event.data))
      setIsMonitoring(true)
    })

    eventSource.addEventListener('new_post', (event) => {
      console.log('[Speed Alerts UI] New post received!')
      const data = JSON.parse(event.data)
      const alert = data.alert as StreamAlert

      // Play notification sound if enabled
      if (soundEnabledRef.current && audioRef.current) {
        audioRef.current.play().catch(() => {})
      }

      // Add to alerts list
      setAlerts((prev) => [alert, ...prev])

      // Show browser notification if permitted
      if (Notification.permission === 'granted') {
        new Notification(`New post in r/${alert.subreddit}`, {
          body: alert.postTitle,
          icon: '/reddit-icon.png',
        })
      }
    })

    eventSource.addEventListener('heartbeat', (event) => {
      console.log('[Speed Alerts UI] Heartbeat:', JSON.parse(event.data))
    })

    eventSource.addEventListener('status', (event) => {
      console.log('[Speed Alerts UI] Status:', JSON.parse(event.data))
    })

    eventSource.addEventListener('error', (event: Event) => {
      console.log('[Speed Alerts UI] Error event received:', event)
      // Don't immediately set monitoring to false - let the browser try to reconnect
    })

    eventSource.onerror = (err) => {
      console.error('[Speed Alerts UI] Connection error:', err)
      // Check if the connection is truly closed
      if (eventSource.readyState === EventSource.CLOSED) {
        console.log('[Speed Alerts UI] Connection closed, stopping monitoring')
        setIsMonitoring(false)
      } else {
        console.log('[Speed Alerts UI] Connection error but may reconnect, readyState:', eventSource.readyState)
      }
    }
  }, [])

  const stopMonitoring = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsMonitoring(false)
  }, [])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  function copyComment(text: string, alertId: string, style: string) {
    navigator.clipboard.writeText(text)
    setCopiedComment(`${alertId}-${style}`)
    setTimeout(() => setCopiedComment(null), 2000)
  }

  async function markActedOn(alertId: string) {
    try {
      await fetch('/api/speed-alerts/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, wasActedOn: true }),
      })
      setAlerts(alerts.map(a =>
        a.id === alertId ? { ...a, wasActedOn: true } : a
      ))
    } catch (err) {
      console.error('Failed to mark alert as acted on:', err)
    }
  }

  async function dismissAlert(alertId: string) {
    try {
      await fetch(`/api/speed-alerts/alerts?id=${alertId}`, {
        method: 'DELETE',
      })
      setAlerts(alerts.filter(a => a.id !== alertId))
    } catch (err) {
      console.error('Failed to dismiss alert:', err)
    }
  }

  const styleColors = {
    helpful: 'bg-[#00D9FF]/10 text-[#00D9FF] border-[#00D9FF]/50',
    curious: 'bg-orange-500/10 text-orange-400 border-orange-500/50',
    supportive: 'bg-[#00D9FF]/10 text-[#00D9FF] border-[#00D9FF]/50',
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

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <DashboardNav />

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">⚡ Speed Alerts</h1>
            <p className="text-gray-400 mt-1">
              Get instant notifications when new posts appear
            </p>
          </div>
          <div className="flex gap-3">
            {isMonitoring ? (
              <button
                onClick={stopMonitoring}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition flex items-center gap-2"
              >
                <span className="w-3 h-3 bg-white rounded-full animate-pulse"></span>
                Stop Monitoring
              </button>
            ) : (
              <button
                onClick={startMonitoring}
                disabled={monitored.length === 0}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition disabled:bg-gray-600 disabled:cursor-not-allowed"
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
              className="glass-button text-gray-300 px-6 py-2 rounded-lg transition"
            >
              ← Back
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Monitored Subreddits */}
          <div className="feature-card rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              Monitored Subreddits
            </h2>

            {/* Add Subreddit Input */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newSubreddit}
                onChange={(e) => setNewSubreddit(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSubreddit()}
                placeholder="Add subreddit (e.g., r/startups)"
                className="flex-1 px-4 py-2 border border-gray-600 bg-[#12121a] rounded-lg focus:ring-2 focus:ring-reddit-orange focus:border-transparent text-white placeholder-gray-500"
              />
              <button
                onClick={addSubreddit}
                className="bg-reddit-orange text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition"
              >
                Add
              </button>
            </div>

            {error && (
              <div className="bg-red-900/50 text-red-300 border border-red-700 px-4 py-2 rounded-lg mb-4">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-reddit-orange"></div>
              </div>
            ) : monitored.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No subreddits monitored yet. Add one above to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {monitored.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-3 bg-[#1a1a24] border border-gray-700 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          sub.isActive ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                      ></span>
                      <span className="font-medium text-[#00D9FF]">
                        r/{sub.subreddit}
                      </span>
                    </div>
                    <button
                      onClick={() => removeSubreddit(sub.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Instructions */}
            <div className="mt-6 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
              <h3 className="font-semibold text-blue-300 mb-2">
                How Speed Alerts Work
              </h3>
              <ol className="text-sm text-blue-200 space-y-1 list-decimal list-inside">
                <li>Add subreddits you want to monitor above</li>
                <li>Click "Start Monitoring" to begin watching for new posts</li>
                <li>Keep this page open in your browser</li>
                <li>When a new post appears, you'll hear a sound and see a popup</li>
                <li>Choose from 3 AI-generated comments and click to copy</li>
                <li>Reddit opens in a new tab - paste your comment and submit!</li>
              </ol>
            </div>
          </div>

          {/* Right Panel - Recent Alerts */}
          <div className="feature-card rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">
                Recent Alerts
              </h2>
              {isMonitoring && (
                <span className="flex items-center gap-2 text-sm text-green-400">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Live
                </span>
              )}
            </div>

            {alerts.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                No alerts yet. Start monitoring to receive alerts.
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`border rounded-lg p-4 ${
                      alert.wasActedOn ? 'bg-[#1a1a24] border-gray-700' : 'bg-[#12121a] border-orange-700'
                    }`}
                  >
                    {/* Post Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-[#00D9FF]">
                            r/{alert.subreddit}
                          </span>
                          <span className="text-xs text-gray-500">
                            by u/{alert.postAuthor}
                          </span>
                        </div>
                        <a
                          href={alert.postUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white font-medium hover:text-reddit-orange"
                          onClick={() => markActedOn(alert.id)}
                        >
                          {alert.postTitle}
                        </a>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {new Date(alert.createdAt).toLocaleTimeString()}
                        </span>
                        <button
                          onClick={() => dismissAlert(alert.id)}
                          className="text-gray-500 hover:text-red-400 transition p-1 rounded hover:bg-red-500/10"
                          title="Dismiss alert"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Comment Options */}
                    <div className="space-y-2">
                      {alert.commentOptions.map((comment) => (
                        <div
                          key={`${alert.id}-${comment.style}`}
                          className={`p-3 rounded border ${styleColors[comment.style]} cursor-pointer hover:opacity-80 transition`}
                          onClick={() => {
                            copyComment(comment.text, alert.id, comment.style)
                            window.open(alert.postUrl, '_blank')
                            markActedOn(alert.id)
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <span className="text-xs font-semibold uppercase">
                                {comment.style}
                              </span>
                              <p className="text-sm mt-1">{comment.text}</p>
                            </div>
                            <span className="text-xs ml-2 whitespace-nowrap">
                              {copiedComment === `${alert.id}-${comment.style}`
                                ? '✓ Copied!'
                                : 'Click to copy'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Discover Subreddits Section */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-white mb-6">Discover Subreddits</h2>
          <DiscoverSection />
        </div>
      </div>
    </div>
  )
}

// Discover Subreddits Component
function DiscoverSection() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Subreddit[]>([])
  const [savedSubreddits, setSavedSubreddits] = useState<Subreddit[]>([])
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [activeTab, setActiveTab] = useState<'search' | 'saved'>('search')

  useEffect(() => {
    fetchSavedSubreddits()
  }, [])

  async function fetchSavedSubreddits() {
    try {
      const response = await fetch('/api/subreddits')
      const data = await response.json()
      setSavedSubreddits(data.subreddits || [])
    } catch (error) {
      console.error('Failed to fetch saved subreddits:', error)
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/subreddits/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, limit: 25 }),
      })

      const data = await response.json()
      setSearchResults(data.subreddits || [])
      setActiveTab('search')
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setLoading(false)
    }
  }

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function saveSubreddit(subreddit: Subreddit) {
    setSavingId(subreddit.name)
    try {
      const response = await fetch('/api/subreddits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: subreddit.name,
          displayName: subreddit.displayName,
          subscribers: subreddit.subscribers,
          description: subreddit.description,
        }),
      })

      if (response.ok) {
        await fetchSavedSubreddits()
        setSearchResults(prev =>
          prev.map(s => (s.name === subreddit.name ? { ...s, saved: true } : s))
        )
        showToast(`${subreddit.displayName} saved!`, 'success')
      } else {
        showToast('Failed to save subreddit', 'error')
      }
    } catch (error) {
      console.error('Failed to save subreddit:', error)
      showToast('Failed to save subreddit', 'error')
    } finally {
      setSavingId(null)
    }
  }

  async function removeSubreddit(id: string) {
    try {
      const response = await fetch(`/api/subreddits/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setSavedSubreddits(prev => prev.filter(s => s.id !== id))
        setSearchResults(prev =>
          prev.map(s => (s.id === id ? { ...s, saved: false } : s))
        )
      }
    } catch (error) {
      console.error('Failed to remove subreddit:', error)
    }
  }

  function formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in ${
          toast.type === 'success'
            ? 'bg-green-900/90 border border-green-700 text-green-200'
            : 'bg-red-900/90 border border-red-700 text-red-200'
        }`}>
          {toast.type === 'success' ? (
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {toast.message}
        </div>
      )}

      <div className="feature-card rounded-lg p-6 mb-6">
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            placeholder="Search for subreddits (e.g., technology, gaming, startups)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-3 border border-gray-600 bg-[#12121a] rounded-lg focus:ring-2 focus:ring-reddit-orange focus:border-transparent text-white placeholder-gray-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-reddit-orange text-white px-8 py-3 rounded-lg hover:bg-orange-600 transition disabled:opacity-50 font-medium min-w-[120px]"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Searching
              </span>
            ) : 'Search'}
          </button>
        </form>

        {/* Loading indicator with message */}
        {loading && (
          <div className="mt-4 flex items-center justify-center gap-3 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
            <svg className="animate-spin h-6 w-6 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div className="text-blue-300">
              <p className="font-medium">Searching Reddit...</p>
              <p className="text-sm text-blue-400">This may take up to 30 seconds</p>
            </div>
          </div>
        )}
      </div>

      <div className="feature-card rounded-lg">
        <div className="border-b border-gray-700">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('search')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'search'
                  ? 'border-reddit-orange text-reddit-orange'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
              }`}
            >
              Search Results ({searchResults.length})
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'saved'
                  ? 'border-reddit-orange text-reddit-orange'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
              }`}
            >
              Saved Subreddits ({savedSubreddits.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'search' && (
            <div>
              {searchResults.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-4xl mb-3 block">🔍</span>
                  <p className="text-gray-400">
                    {searchQuery ? 'No results found' : 'Search for subreddits to get started'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {searchResults.map((subreddit) => (
                    <div
                      key={subreddit.name}
                      className="border border-gray-700 bg-[#12121a] rounded-lg p-4 hover:border-[#00D9FF] transition"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-[#00D9FF] text-lg">
                            {subreddit.displayName}
                          </h3>
                          <p className="text-sm text-gray-400 mt-1">
                            {formatNumber(subreddit.subscribers)} members
                          </p>
                          {subreddit.description && (
                            <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                              {subreddit.description}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() =>
                            subreddit.saved
                              ? removeSubreddit(subreddit.id!)
                              : saveSubreddit(subreddit)
                          }
                          disabled={savingId === subreddit.name}
                          className={`ml-4 px-4 py-2 rounded-lg text-sm font-medium transition min-w-[80px] ${
                            subreddit.saved
                              ? 'bg-green-900/50 text-green-400 hover:bg-green-900'
                              : 'bg-reddit-orange text-white hover:bg-orange-600 disabled:opacity-50'
                          }`}
                        >
                          {savingId === subreddit.name ? (
                            <span className="flex items-center justify-center gap-1">
                              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Saving
                            </span>
                          ) : subreddit.saved ? '✓ Saved' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'saved' && (
            <div>
              {savedSubreddits.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-4xl mb-3 block">📋</span>
                  <p className="text-gray-400 mb-4">No saved subreddits yet</p>
                  <button
                    onClick={() => setActiveTab('search')}
                    className="text-reddit-orange hover:underline"
                  >
                    Search for subreddits to save
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedSubreddits.map((subreddit) => (
                    <div
                      key={subreddit.id}
                      className="border border-gray-700 bg-[#12121a] rounded-lg p-4 hover:border-[#00D9FF] transition"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-[#00D9FF]">
                            {subreddit.displayName}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {formatNumber(subreddit.subscribers)} members
                          </p>
                        </div>
                        <button
                          onClick={() => removeSubreddit(subreddit.id!)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                      <Link
                        href={`/dashboard/new-post?subreddit=${subreddit.name}`}
                        className="mt-3 block text-center text-sm bg-reddit-orange text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition"
                      >
                        Create Post
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

interface Subreddit {
  id?: string
  name: string
  displayName: string
  subscribers: number
  description?: string
  saved?: boolean
  relevance?: number
}

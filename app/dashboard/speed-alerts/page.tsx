'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'

interface MonitoredSubreddit {
  id: string
  subreddit: string
  isActive: boolean
  lastChecked: string
  filterMode: 'all' | 'questions'
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
  const [addingPending, setAddingPending] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const eventSourceRef = useRef<EventSource | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const soundEnabledRef = useRef(true)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 10
  const baseReconnectDelay = 2000 // 2 seconds

  // Load initial data
  useEffect(() => {
    fetchMonitored()
    fetchAlerts()
  }, [])

  // Check for pending subreddits from analysis and auto-add them
  useEffect(() => {
    async function addPendingSubreddits() {
      const stored = localStorage.getItem('pendingSubreddits')
      if (!stored) return

      try {
        const pendingSubreddits: string[] = JSON.parse(stored)
        if (pendingSubreddits.length === 0) return

        setAddingPending(true)
        setPendingCount(pendingSubreddits.length)

        // Add each subreddit
        let addedCount = 0
        for (const subreddit of pendingSubreddits) {
          try {
            const response = await fetch('/api/speed-alerts/monitored', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ subreddit }),
            })
            if (response.ok) {
              addedCount++
            }
          } catch (err) {
            console.error(`Failed to add subreddit: ${subreddit}`, err)
          }
        }

        // Clear the pending subreddits
        localStorage.removeItem('pendingSubreddits')

        // Refresh the data
        await fetchMonitored()

        setAddingPending(false)
        if (addedCount > 0) {
          alert(`Added ${addedCount} subreddits from your business analysis!`)
        }
      } catch (err) {
        console.error('Failed to process pending subreddits:', err)
        localStorage.removeItem('pendingSubreddits')
        setAddingPending(false)
      }
    }

    addPendingSubreddits()
  }, []) // Run only once on mount

  // Play notification sound using Web Audio API (no file needed)
  const playNotificationSound = useCallback(() => {
    if (!soundEnabledRef.current) return

    try {
      // Create or resume AudioContext (needed for browsers that pause audio)
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }

      const ctx = audioContextRef.current
      if (ctx.state === 'suspended') {
        ctx.resume()
      }

      // Create a pleasant notification beep
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      // Two-tone notification sound
      oscillator.frequency.setValueAtTime(880, ctx.currentTime) // A5
      oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1) // Higher tone

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.3)
    } catch (err) {
      console.error('[Speed Alerts] Could not play notification sound:', err)
    }
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

  async function updateFilterMode(id: string, filterMode: 'all' | 'questions') {
    try {
      const response = await fetch('/api/speed-alerts/monitored', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, filterMode }),
      })
      if (response.ok) {
        setMonitored(monitored.map(m =>
          m.id === id ? { ...m, filterMode } : m
        ))
      }
    } catch (err) {
      console.error('Failed to update filter mode:', err)
    }
  }

  async function resetSubreddit(id: string) {
    try {
      const response = await fetch('/api/speed-alerts/monitored', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, reset: true }),
      })
      if (response.ok) {
        // The next monitoring cycle will fetch fresh posts
        console.log('[Speed Alerts UI] Subreddit reset - will fetch fresh posts')
      }
    } catch (err) {
      console.error('Failed to reset subreddit:', err)
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
      reconnectAttemptsRef.current = 0 // Reset on successful connection
    })

    eventSource.addEventListener('new_post', (event) => {
      console.log('[Speed Alerts UI] New post received!')
      const data = JSON.parse(event.data)
      const alert = data.alert as StreamAlert

      // Reset reconnect attempts on successful data
      reconnectAttemptsRef.current = 0

      // Play notification sound if enabled
      playNotificationSound()

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
      reconnectAttemptsRef.current = 0 // Reset on successful heartbeat
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
        console.log('[Speed Alerts UI] Connection closed')

        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current)
          console.log(`[Speed Alerts UI] Attempting reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`)

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++
            startMonitoring()
          }, delay)
        } else {
          console.log('[Speed Alerts UI] Max reconnect attempts reached, stopping monitoring')
          setIsMonitoring(false)
        }
      } else {
        console.log('[Speed Alerts UI] Connection error but may reconnect, readyState:', eventSource.readyState)
      }
    }
  }, [playNotificationSound])

  const stopMonitoring = useCallback(() => {
    // Clear reconnect timeout if any
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    reconnectAttemptsRef.current = 0

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsMonitoring(false)
  }, [])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
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

  async function clearAllAlerts() {
    if (!confirm('Clear all alerts? This cannot be undone.')) {
      return
    }

    try {
      await fetch('/api/speed-alerts/alerts?clearAll=true', {
        method: 'DELETE',
      })
      setAlerts([])
    } catch (err) {
      console.error('Failed to clear alerts:', err)
    }
  }

  const styleColors = {
    helpful: 'bg-[#00D9FF]/10 text-[#00D9FF] border-[#00D9FF]/50',
    curious: 'bg-orange-500/10 text-orange-400 border-orange-500/50',
    supportive: 'bg-[#00D9FF]/10 text-[#00D9FF] border-[#00D9FF]/50',
  }

  return (
    <>
      {/* Controls */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6">
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
            disabled={monitored.length === 0}
            className="bg-[#00D9FF] text-black font-medium px-4 sm:px-6 py-2 rounded-lg hover:bg-[#00D9FF]/80 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
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
      </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Left Panel - Monitored Subreddits */}
          <div className="feature-card rounded-lg p-4 flex flex-col">
            <h2 className="text-[22px] font-semibold text-white mb-3">
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
                className="bg-[#00D9FF] text-black px-6 py-2 rounded-lg hover:bg-opacity-80 transition font-semibold"
              >
                Add
              </button>
            </div>

            {error && (
              <div className="bg-red-900/50 text-red-300 border border-red-700 px-4 py-2 rounded-lg mb-4">
                {error}
              </div>
            )}

            {/* Subreddits list - takes remaining space */}
            <div className="flex-1 mb-4">
              {isLoading ? (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-reddit-orange"></div>
                </div>
              ) : monitored.length === 0 ? (
                <div className="text-center py-4 text-gray-400 text-sm">
                  No subreddits monitored yet. Add one above to get started.
                </div>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
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
                      <div className="flex items-center gap-2">
                        <select
                          value={sub.filterMode || 'all'}
                          onChange={(e) => updateFilterMode(sub.id, e.target.value as 'all' | 'questions')}
                          className="text-xs px-2 py-1 bg-[#12121a] border border-gray-600 rounded text-gray-300 focus:border-[#00D9FF] focus:outline-none cursor-pointer [&>option]:bg-[#12121a] [&>option]:text-gray-300"
                          title="Filter posts by type"
                          style={{ colorScheme: 'dark' }}
                        >
                          <option value="all">All Posts</option>
                          <option value="questions">Questions Only</option>
                        </select>
                        <button
                          onClick={() => resetSubreddit(sub.id)}
                          className="text-[#00D9FF] hover:text-cyan-300 text-sm"
                          title="Reset to fetch fresh posts"
                        >
                          Refresh
                        </button>
                        <button
                          onClick={() => removeSubreddit(sub.id)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Instructions - pushed to bottom */}
            <div className="mt-auto p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
              <h3 className="font-medium text-blue-300 text-sm mb-1">
                How It Works
              </h3>
              <p className="text-xs text-blue-200">
                Add subreddits → Start monitoring → Get alerts with AI comments → Copy & post!
              </p>
            </div>
          </div>

          {/* Right Panel - Recent Alerts */}
          <div className="feature-card rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-[22px] font-semibold text-[#00D9FF]">
                Recent Alerts
              </h2>
              <div className="flex items-center gap-3">
                {alerts.length > 0 && (
                  <button
                    onClick={clearAllAlerts}
                    className="text-sm text-gray-400 hover:text-red-400 transition"
                  >
                    Clear All
                  </button>
                )}
                {isMonitoring && (
                  <span className="flex items-center gap-2 text-sm text-green-400">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Live
                  </span>
                )}
              </div>
            </div>

            {alerts.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                No alerts yet. Start monitoring to receive alerts.
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
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

                    {/* Comment Options - Compact titles only */}
                    <div className="flex flex-wrap gap-2">
                      {alert.commentOptions.map((comment) => (
                        <button
                          key={`${alert.id}-${comment.style}`}
                          className={`px-3 py-1.5 rounded border text-xs font-semibold uppercase ${styleColors[comment.style]} cursor-pointer hover:opacity-80 transition`}
                          title={`Click to copy ${comment.style} comment and open Reddit post`}
                          onClick={() => {
                            copyComment(comment.text, alert.id, comment.style)
                            window.open(alert.postUrl, '_blank')
                            markActedOn(alert.id)
                          }}
                        >
                          {copiedComment === `${alert.id}-${comment.style}`
                            ? '✓ Copied!'
                            : comment.style}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      {/* Keyword Monitoring Section */}
      <div className="mt-8">
        {/* Section Header */}
        <h2 className="text-[22px] font-bold text-white mb-3 text-center">Keyword Monitoring</h2>

        {/* Controls - matches top section pattern */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6">
          <button
            type="button"
            className="bg-[#00D9FF] text-black font-medium px-4 sm:px-6 py-2 rounded-lg hover:bg-[#00D9FF]/80 transition text-sm sm:text-base cursor-pointer"
            onClick={() => {
              // Trigger scan via the KeywordMonitoredPanel
              const scanBtn = document.querySelector('[data-keyword-scan]') as HTMLButtonElement
              if (scanBtn) scanBtn.click()
            }}
          >
            Start Monitoring
          </button>
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
        </div>

        {/* Keyword Alerts - 2 column grid matching above pattern */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <KeywordMonitoredPanel />
          <KeywordAlertsPanel />
        </div>
      </div>

      {/* Discover Subreddits - Full Width at Bottom */}
      <div className="mt-8">
        <h2 className="text-[22px] font-bold text-white mb-3">Discover Subreddits</h2>
        <DiscoverSection />
      </div>

      <div className="text-center mt-8">
        <Link href="/" className="text-gray-400 hover:text-white transition">
          ← Back to Home
        </Link>
      </div>
    </>
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
  const [savedExpanded, setSavedExpanded] = useState(false)
  const [searchExpanded, setSearchExpanded] = useState(false)

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

      <div className="feature-card rounded-lg p-4 mb-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Search subreddits..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-600 bg-[#12121a] rounded-lg focus:ring-2 focus:ring-reddit-orange focus:border-transparent text-white placeholder-gray-500 text-sm"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-reddit-orange text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition disabled:opacity-50 font-medium text-sm"
          >
            {loading ? '...' : 'Search'}
          </button>
        </form>
      </div>

      <div className="feature-card rounded-lg">
        <div className="border-b border-gray-700">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('search')}
              className={`px-4 py-2 text-xs font-medium border-b-2 ${
                activeTab === 'search'
                  ? 'border-reddit-orange text-reddit-orange'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Results ({searchResults.length})
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`px-4 py-2 text-xs font-medium border-b-2 ${
                activeTab === 'saved'
                  ? 'border-reddit-orange text-reddit-orange'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Saved ({savedSubreddits.length})
            </button>
          </nav>
        </div>

        <div className="p-3 max-h-[200px] overflow-y-auto">
          {activeTab === 'search' && (
            <div>
              {searchResults.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-400 text-sm">
                    {searchQuery ? 'No results found' : 'Search for subreddits'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(searchExpanded ? searchResults : searchResults.slice(0, 5)).map((subreddit) => (
                    <div
                      key={subreddit.name}
                      className="flex items-center justify-between p-2 border border-gray-700 bg-[#12121a] rounded-lg hover:border-[#00D9FF] transition"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-[#00D9FF] text-sm">{subreddit.displayName}</span>
                        <span className="text-xs text-gray-400 ml-2">{formatNumber(subreddit.subscribers)}</span>
                      </div>
                      <button
                        onClick={() => subreddit.saved ? removeSubreddit(subreddit.id!) : saveSubreddit(subreddit)}
                        disabled={savingId === subreddit.name}
                        className={`px-3 py-1 rounded text-xs font-medium transition ${
                          subreddit.saved
                            ? 'bg-green-900/50 text-green-400'
                            : 'bg-reddit-orange text-white hover:bg-orange-600'
                        }`}
                      >
                        {savingId === subreddit.name ? '...' : subreddit.saved ? '✓' : 'Save'}
                      </button>
                    </div>
                  ))}
                  {searchResults.length > 5 && (
                    <button
                      onClick={() => setSearchExpanded(!searchExpanded)}
                      className="w-full text-center text-xs text-[#00D9FF] hover:text-[#00D9FF]/80 py-2 transition cursor-pointer"
                    >
                      {searchExpanded ? '▲ Show less' : `▼ +${searchResults.length - 5} more`}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'saved' && (
            <div>
              {savedSubreddits.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-400 text-sm">No saved subreddits</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(savedExpanded ? savedSubreddits : savedSubreddits.slice(0, 5)).map((subreddit) => (
                    <div
                      key={subreddit.id}
                      className="flex items-center justify-between p-2 border border-gray-700 bg-[#12121a] rounded-lg hover:border-[#00D9FF] transition"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-[#00D9FF] text-sm">{subreddit.displayName}</span>
                        <span className="text-xs text-gray-400 ml-2">{formatNumber(subreddit.subscribers)}</span>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/dashboard/new-post?subreddit=${subreddit.name}`}
                          className="px-3 py-1 rounded text-xs font-medium bg-reddit-orange text-white hover:bg-orange-600 transition"
                        >
                          Post
                        </Link>
                        <button
                          onClick={() => removeSubreddit(subreddit.id!)}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                  {savedSubreddits.length > 5 && (
                    <button
                      onClick={() => setSavedExpanded(!savedExpanded)}
                      className="w-full text-center text-xs text-[#00D9FF] hover:text-[#00D9FF]/80 py-2 transition cursor-pointer"
                    >
                      {savedExpanded ? '▲ Show less' : `▼ +${savedSubreddits.length - 5} more`}
                    </button>
                  )}
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

// Keyword Monitored Panel (Left Panel - matches Monitored Subreddits pattern)
function KeywordMonitoredPanel() {
  const [keywords, setKeywords] = useState<{ id: string; keyword: string; subreddits: string | null; isActive: boolean; _count: { matches: number } }[]>([])
  const [newKeyword, setNewKeyword] = useState('')
  const [newSubreddits, setNewSubreddits] = useState('')
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Retry helper for slow API calls
  async function fetchWithRetry(url: string, options?: RequestInit, retries = 3): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options)
        if (!response.ok && response.status >= 500) throw new Error(`HTTP ${response.status}`)
        return response
      } catch (error) {
        if (i === retries - 1) throw error
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)))
      }
    }
    throw new Error('Max retries exceeded')
  }

  useEffect(() => {
    fetchKeywords()
  }, [])

  async function fetchKeywords() {
    try {
      setLoading(true)
      const response = await fetchWithRetry('/api/keywords')
      const data = await response.json()
      setKeywords(data.keywords || [])
    } catch (err) {
      console.error('Failed to fetch keywords:', err)
      // Silent fail - data will refresh on next attempt
    } finally {
      setLoading(false)
    }
  }

  async function addKeyword() {
    if (!newKeyword.trim()) return
    setError(null)
    try {
      const response = await fetchWithRetry('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          keyword: newKeyword,
          subreddits: newSubreddits.trim() || null,
        }),
      })
      if (response.ok) {
        setNewKeyword('')
        setNewSubreddits('')
        // Refresh list - if this fails, keyword was still added successfully
        try {
          await fetchKeywords()
        } catch {
          // Silent fail - keyword was added, will show on next refresh
        }
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to add keyword')
      }
    } catch (err) {
      setError('Failed to add keyword - please try again')
    }
  }

  async function deleteKeyword(keywordId: string) {
    try {
      await fetchWithRetry('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', keywordId }),
      })
      await fetchKeywords()
    } catch (err) {
      console.error('Failed to delete keyword:', err)
    }
  }

  async function toggleKeyword(keywordId: string, isActive: boolean) {
    try {
      await fetchWithRetry('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', keywordId, isActive: !isActive }),
      })
      await fetchKeywords()
    } catch (err) {
      console.error('Failed to toggle keyword:', err)
    }
  }

  async function scanNow() {
    try {
      setScanning(true)
      await fetchWithRetry('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scan' }),
      })
      await fetchKeywords()
    } catch (err) {
      console.error('Scan failed:', err)
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="feature-card rounded-xl p-4 sm:p-5 flex flex-col h-full">
      {/* Header */}
      <h3 className="text-[22px] font-semibold text-white mb-3">Monitored Keywords</h3>

      {/* Add Input */}
      <div className="space-y-2 mb-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
            placeholder="Enter keyword to monitor..."
            className="flex-1 px-4 py-2 border border-gray-600 bg-[#12121a] rounded-lg focus:border-[#00D9FF] focus:outline-none text-white placeholder-gray-500"
          />
          <button
            onClick={addKeyword}
            disabled={!newKeyword.trim()}
            className="bg-[#00D9FF] text-black px-6 py-2 rounded-lg hover:bg-opacity-80 transition font-semibold disabled:opacity-70"
          >
            Add
          </button>
        </div>
        <input
          type="text"
          value={newSubreddits}
          onChange={(e) => setNewSubreddits(e.target.value)}
          placeholder="Subreddits (optional): startups, SaaS, entrepreneur"
          className="w-full px-4 py-2 border border-gray-600 bg-[#12121a] rounded-lg focus:border-[#00D9FF] focus:outline-none text-white placeholder-gray-500 text-sm"
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-300 px-3 py-2 rounded-lg mb-3 text-sm">
          {error}
        </div>
      )}

      {/* Keywords List */}
      <div className="flex-1 mb-4">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#00D9FF]"></div>
          </div>
        ) : keywords.length === 0 ? (
          <p className="text-gray-500 text-center py-6">No keywords being monitored. Add one above!</p>
        ) : (
          <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2">
            {keywords.map((kw) => (
              <div
                key={kw.id}
                className="flex items-center justify-between p-3 bg-[#1a1a24] border border-gray-700 rounded-lg hover:border-gray-600 transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        kw.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
                      }`}
                    ></span>
                    <span className="font-medium text-[#00D9FF]">{kw.keyword}</span>
                    <span className="text-gray-500 text-sm">({kw._count.matches})</span>
                  </div>
                  {kw.subreddits ? (
                    <div className="ml-5 mt-1 text-xs text-gray-400 truncate">
                      r/{kw.subreddits.split(',').join(', r/')}
                    </div>
                  ) : (
                    <div className="ml-5 mt-1 text-xs text-gray-500">All Reddit</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleKeyword(kw.id, kw.isActive)}
                    className={`text-xs px-2 py-1 rounded ${
                      kw.isActive
                        ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                        : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    }`}
                    title={kw.isActive ? 'Pause monitoring' : 'Resume monitoring'}
                  >
                    {kw.isActive ? '⏸' : '▶'}
                  </button>
                  <button
                    onClick={() => deleteKeyword(kw.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hidden trigger for top-level Start Monitoring button */}
      <button
        data-keyword-scan
        onClick={scanNow}
        className="hidden"
        aria-hidden="true"
      />

      {/* Instructions */}
      <div className="mt-auto p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
        <h3 className="font-medium text-blue-300 text-sm mb-1">
          How It Works
        </h3>
        <p className="text-xs text-blue-200">
          Add keywords → Start monitoring → Get alerts when posts mention them!
        </p>
      </div>
    </div>
  )
}

// Keyword Alerts Panel (Right Panel - matches Recent Alerts pattern)
function KeywordAlertsPanel() {
  const [matches, setMatches] = useState<{ id: string; postTitle: string; postUrl: string; subreddit: string; matchedAt: string; keyword: { keyword: string }; isRead?: boolean; aiSuggestions?: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedComment, setCopiedComment] = useState<string | null>(null)

  // Retry helper for slow API calls
  async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url)
        if (!response.ok && response.status >= 500) throw new Error(`HTTP ${response.status}`)
        return response
      } catch (error) {
        if (i === retries - 1) throw error
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)))
      }
    }
    throw new Error('Max retries exceeded')
  }

  useEffect(() => {
    fetchMatches()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMatches, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchMatches() {
    try {
      const response = await fetchWithRetry('/api/keywords/matches?limit=50')
      const data = await response.json()
      setMatches(data.matches || [])
    } catch (err) {
      console.error('Failed to fetch matches:', err)
      // Silent fail for polling - data will refresh on next interval
    } finally {
      setLoading(false)
    }
  }

  async function clearAll() {
    try {
      await fetch('/api/keywords/matches', {
        method: 'DELETE',
      })
      setMatches([])
    } catch (err) {
      console.error('Failed to clear matches:', err)
    }
  }

  function formatTimeAgo(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${Math.floor(diffHours / 24)}d ago`
  }

  function copyComment(text: string, matchId: string, style: string) {
    navigator.clipboard.writeText(text)
    setCopiedComment(`${matchId}-${style}`)
    setTimeout(() => setCopiedComment(null), 2000)
  }

  // Deduplicate matches by postUrl - group keywords for same post
  const deduplicatedMatches = useMemo(() => {
    const grouped = new Map<string, {
      id: string
      postTitle: string
      postUrl: string
      subreddit: string
      matchedAt: string
      keywords: string[]
      aiSuggestions: string[]
    }>()

    for (const match of matches) {
      const existing = grouped.get(match.postUrl)
      if (existing) {
        // Add keyword if not already present
        if (!existing.keywords.includes(match.keyword.keyword)) {
          existing.keywords.push(match.keyword.keyword)
        }
        // Use latest matchedAt
        if (new Date(match.matchedAt) > new Date(existing.matchedAt)) {
          existing.matchedAt = match.matchedAt
        }
        // Merge AI suggestions if available
        if (match.aiSuggestions) {
          try {
            const suggestions = JSON.parse(match.aiSuggestions) as string[]
            for (const s of suggestions) {
              if (!existing.aiSuggestions.includes(s)) {
                existing.aiSuggestions.push(s)
              }
            }
          } catch {}
        }
      } else {
        let aiSuggestions: string[] = []
        if (match.aiSuggestions) {
          try {
            aiSuggestions = JSON.parse(match.aiSuggestions) as string[]
          } catch {}
        }
        grouped.set(match.postUrl, {
          id: match.id,
          postTitle: match.postTitle,
          postUrl: match.postUrl,
          subreddit: match.subreddit,
          matchedAt: match.matchedAt,
          keywords: [match.keyword.keyword],
          aiSuggestions,
        })
      }
    }

    return Array.from(grouped.values()).sort(
      (a, b) => new Date(b.matchedAt).getTime() - new Date(a.matchedAt).getTime()
    )
  }, [matches])

  const styleLabels = ['helpful', 'curious', 'supportive'] as const
  const styleColors = {
    helpful: 'bg-[#00D9FF]/10 text-[#00D9FF] border-[#00D9FF]/50',
    curious: 'bg-orange-500/10 text-orange-400 border-orange-500/50',
    supportive: 'bg-green-500/10 text-green-400 border-green-500/50',
  }

  return (
    <div className="feature-card rounded-xl p-4 sm:p-5 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[22px] font-semibold text-[#00D9FF]">Recent Keyword Alerts</h3>
        <div className="flex items-center gap-3">
          {matches.length > 0 && (
            <button
              onClick={clearAll}
              className="text-gray-400 hover:text-red-400 text-sm transition"
            >
              Clear All
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-gray-400 text-sm">Live</span>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00D9FF]"></div>
        </div>
      ) : deduplicatedMatches.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-center">
            No keyword matches yet. Add keywords and they&apos;ll appear here when found.
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
          {deduplicatedMatches.map((match) => (
            <div
              key={match.id}
              className="p-4 border border-[#00D9FF]/30 bg-[#12121a] rounded-lg hover:border-[#00D9FF] transition"
            >
              {/* Match Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {match.keywords.map((kw) => (
                    <span key={kw} className="px-2 py-0.5 bg-[#00D9FF]/20 text-[#00D9FF] rounded text-xs font-medium">
                      {kw}
                    </span>
                  ))}
                  <span className="text-blue-400">r/{match.subreddit}</span>
                  <span className="text-gray-500">{formatTimeAgo(match.matchedAt)}</span>
                </div>
              </div>

              {/* Post Title */}
              <a
                href={match.postUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-white hover:text-[#00D9FF] transition mb-3 line-clamp-2"
              >
                {match.postTitle}
              </a>

              {/* AI Reply Buttons - or Open Thread link if no suggestions */}
              {match.aiSuggestions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {match.aiSuggestions.slice(0, 3).map((suggestion, idx) => {
                    const style = styleLabels[idx] || 'helpful'
                    return (
                      <button
                        key={`${match.id}-${style}`}
                        className={`px-3 py-1.5 rounded border text-xs font-semibold uppercase ${styleColors[style]} cursor-pointer hover:opacity-80 transition`}
                        title={`Click to copy ${style} reply and open Reddit post`}
                        onClick={() => {
                          copyComment(suggestion, match.id, style)
                          window.open(match.postUrl, '_blank')
                        }}
                      >
                        {copiedComment === `${match.id}-${style}` ? '✓ Copied!' : style}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <a
                  href={match.postUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#00D9FF] text-sm hover:underline"
                >
                  Open Thread →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

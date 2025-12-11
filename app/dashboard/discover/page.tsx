'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import DashboardNav from '@/components/DashboardNav'

interface Subreddit {
  id?: string
  name: string
  displayName: string
  subscribers: number
  description?: string
  saved?: boolean
  relevance?: number
}

export default function DiscoverSubreddits() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Subreddit[]>([])
  const [savedSubreddits, setSavedSubreddits] = useState<Subreddit[]>([])
  const [loading, setLoading] = useState(false)
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

  async function saveSubreddit(subreddit: Subreddit) {
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
      }
    } catch (error) {
      console.error('Failed to save subreddit:', error)
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
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      {/* Dot Grid Background */}
      <div className="dot-grid-background">
        <div className="dot-grid-container">
          <div className="dot-grid"></div>
          <div className="dot-grid-overlay"></div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardNav />
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Discover Subreddits</h1>
            <p className="text-gray-400 mt-1 text-sm sm:text-base">Find relevant communities for your content</p>
          </div>
          <Link
            href="/dashboard"
            className="glass-button text-gray-300 px-4 sm:px-6 py-2 rounded-lg transition text-sm sm:text-base"
          >
            ← Back
          </Link>
        </div>

        <div className="feature-card rounded-lg p-4 sm:p-6 mb-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search for subreddits (e.g., technology, gaming, startups)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-600 bg-[#12121a] rounded-lg focus:ring-2 focus:ring-reddit-orange focus:border-transparent text-white placeholder-gray-500 text-sm sm:text-base"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-reddit-orange text-white px-6 sm:px-8 py-3 rounded-lg hover:bg-orange-600 transition disabled:opacity-50 font-medium text-sm sm:text-base"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>
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

          <div className="p-4 sm:p-6">
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
                            className={`ml-4 px-4 py-2 rounded-lg text-sm font-medium transition ${
                              subreddit.saved
                                ? 'bg-green-900/50 text-green-400 hover:bg-green-900'
                                : 'bg-reddit-orange text-white hover:bg-orange-600'
                            }`}
                          >
                            {subreddit.saved ? '✓ Saved' : 'Save'}
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
      </div>
    </div>
  )
}

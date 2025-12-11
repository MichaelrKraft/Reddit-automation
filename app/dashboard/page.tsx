'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import FounderBanner from '@/components/FounderBanner'

interface UserStats {
  isLoggedIn: boolean
  tier?: string
  signupNumber?: number
  hasLifetimeDeal?: boolean
  founderSpotsRemaining: number
  isFounder?: boolean
  canPurchaseLifetime?: boolean
}

interface Post {
  id: string
  title: string
  content: string
  status: string
  scheduledAt: string | null
  postedAt: string | null
  url: string | null
  subreddit: {
    name: string
    displayName: string
  }
  analytics?: {
    upvotes: number
    commentCount: number
    score: number
  }
}

export default function Dashboard() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [userStats, setUserStats] = useState<UserStats | null>(null)

  useEffect(() => {
    fetchPosts()
    fetchUserStats()
  }, [filter])

  async function fetchUserStats() {
    try {
      const response = await fetch('/api/user/stats')
      const data = await response.json()
      setUserStats(data)
    } catch (error) {
      console.error('Failed to fetch user stats:', error)
    }
  }

  async function fetchPosts() {
    try {
      setLoading(true)
      const url = filter === 'all' 
        ? '/api/posts' 
        : `/api/posts?status=${filter}`
      const response = await fetch(url)
      const data = await response.json()
      setPosts(data.posts || [])
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const statusColors = {
    scheduled: 'bg-blue-100 text-blue-800',
    posted: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  }

  // Debug log
  console.log('Dashboard userStats:', userStats)
  console.log('canPurchaseLifetime:', userStats?.canPurchaseLifetime)

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      {/* Founder Banner - shows for founders who haven't purchased lifetime deal */}
      {userStats?.canPurchaseLifetime && (
        <FounderBanner
          signupNumber={userStats.signupNumber || 0}
          founderSpotsRemaining={userStats.founderSpotsRemaining}
          hasLifetimeDeal={userStats.hasLifetimeDeal || false}
          canPurchaseLifetime={userStats.canPurchaseLifetime}
        />
      )}

      {/* Dot Grid Background */}
      <div className="dot-grid-background">
        <div className="dot-grid-container">
          <div className="dot-grid"></div>
          <div className="dot-grid-overlay"></div>
        </div>
      </div>

      {/* Logo in upper left - moves down when founder banner is showing */}
      <div className={`absolute z-20 px-4 sm:px-6 lg:px-8 max-w-7xl left-1/2 -translate-x-1/2 w-full ${userStats?.canPurchaseLifetime ? 'top-16' : 'top-4 sm:top-6'}`}>
        <Link href="/">
          <img
            src="/reddride-logo-dark.png"
            alt="ReddRide - The Reddit AI Automation Platform"
            className="h-16 sm:h-[101px] object-contain cursor-pointer"
          />
        </Link>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-8">
          <div className="mb-4 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400 mt-1 text-sm sm:text-base">Manage your Reddit posts</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Link
              href="/dashboard/opportunity-miner"
              className="bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-300 border border-red-500/50 px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg hover:bg-red-500/30 transition font-semibold text-sm sm:text-base"
            >
              Opportunity Miner
            </Link>
            <Link
              href="/dashboard/spy-mode"
              className="bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg hover:bg-[#00D9FF]/30 transition font-semibold text-sm sm:text-base"
            >
              Spy Mode
            </Link>
            <Link
              href="/dashboard/speed-alerts"
              className="bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg hover:bg-[#00D9FF]/30 transition font-semibold text-sm sm:text-base"
            >
              Speed Alerts
            </Link>
            <Link
              href="/dashboard/viral"
              className="bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg hover:bg-[#00D9FF]/30 transition font-semibold text-sm sm:text-base"
            >
              Viral Optimizer
            </Link>
            <Link
              href="/dashboard/timing"
              className="bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg hover:bg-[#00D9FF]/30 transition font-semibold text-sm sm:text-base"
            >
              Optimal Times
            </Link>
            <Link
              href="/dashboard/analytics"
              className="bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg hover:bg-[#00D9FF]/30 transition font-semibold text-sm sm:text-base"
            >
              Analytics
            </Link>
            <Link
              href="/dashboard/comments"
              className="bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg hover:bg-[#00D9FF]/30 transition font-semibold text-sm sm:text-base"
            >
              Comments
            </Link>
            <Link
              href="/dashboard/calendar"
              className="bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg hover:bg-[#00D9FF]/30 transition font-semibold text-sm sm:text-base"
            >
              Calendar
            </Link>
            <Link
              href="/warmup"
              className="bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg hover:bg-[#00D9FF]/30 transition font-semibold text-sm sm:text-base"
            >
              Warmup
            </Link>
            <Link
              href="/dashboard/new-post"
              className="bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg hover:bg-[#00D9FF]/30 transition font-semibold text-sm sm:text-base"
            >
              + New Post
            </Link>
          </div>
        </div>

        <div className="feature-card rounded-lg mb-6">
          <div className="border-b border-gray-700">
            <nav className="flex -mb-px">
              {['all', 'scheduled', 'posted', 'failed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 ${
                    filter === status
                      ? 'border-reddit-orange text-reddit-orange'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-reddit-orange"></div>
                <p className="text-gray-400 mt-2">Loading posts...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 mb-4">No posts found</p>
                <Link
                  href="/dashboard/new-post"
                  className="text-reddit-orange hover:underline"
                >
                  Create your first post
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="border border-gray-700 bg-[#12121a] rounded-lg p-3 sm:p-4 hover:border-[#00D9FF] transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-medium text-[#00D9FF]">
                            {post.subreddit.displayName}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${statusColors[post.status as keyof typeof statusColors]}`}>
                            {post.status}
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-semibold text-white mb-1 line-clamp-2">
                          {post.title}
                        </h3>
                        <p className="text-gray-400 text-xs sm:text-sm line-clamp-2 mb-2">
                          {post.content}
                        </p>
                        <div className="flex flex-wrap gap-2 sm:gap-4 text-xs text-gray-500">
                          {post.scheduledAt && (
                            <span>
                              Scheduled: {new Date(post.scheduledAt).toLocaleDateString()}
                            </span>
                          )}
                          {post.postedAt && (
                            <span>
                              Posted: {new Date(post.postedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2">
                        {post.analytics && (
                          <div className="text-left sm:text-right flex sm:block gap-3">
                            <div className="text-sm font-medium text-white">
                              ↑ {post.analytics.upvotes}
                            </div>
                            <div className="text-xs text-gray-400">
                              💬 {post.analytics.commentCount}
                            </div>
                          </div>
                        )}
                        {post.url && (
                          <a
                            href={post.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-reddit-orange hover:underline whitespace-nowrap"
                          >
                            View on Reddit →
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="text-center">
          <Link href="/" className="text-gray-400 hover:text-white transition">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import PerformanceChart from '@/components/spy-mode/PerformanceChart'
import PostingHeatmap from '@/components/spy-mode/PostingHeatmap'
import SubredditBreakdown from '@/components/spy-mode/SubredditBreakdown'
import InsightPanel from '@/components/spy-mode/InsightPanel'

interface AccountData {
  account: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
    totalKarma: number
    accountAge: string | null
    isActive: boolean
    notes: string | null
    lastChecked: string
  }
  analytics: {
    avgScore: number
    avgComments: number
    totalPosts: number
    successRate: number
    postsPerWeek: number
    topSubreddits: { name: string; count: number; avgScore: number }[]
    postingHeatmap: { day: number; hour: number; count: number; avgScore: number }[]
    recentTrend: number[]
  }
  bestPosts: Post[]
  recentPosts: Post[]
  insights: Insight[]
  totalPosts: number
}

interface Post {
  id: string
  redditId: string
  title: string
  url: string
  subreddit: string
  score: number
  commentCount: number
  postedAt: string
}

interface Insight {
  id: string
  insightType: string
  title: string
  description: string
  actionItems: string[]
  confidence: number
  createdAt: string
}

export default function SpyAccountPage() {
  const params = useParams()
  const id = params.id as string

  const [data, setData] = useState<AccountData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAccount()
  }, [id])

  async function fetchAccount() {
    try {
      const response = await fetch(`/api/spy-mode/accounts/${id}`)
      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to load account')
        return
      }

      setData(result)
    } catch (err) {
      setError('Failed to load account')
    } finally {
      setIsLoading(false)
    }
  }

  async function generateInsights() {
    setIsGeneratingInsights(true)
    try {
      const response = await fetch(`/api/spy-mode/accounts/${id}/analyze`, {
        method: 'POST',
      })
      const result = await response.json()

      if (response.ok && result.insights) {
        setData(prev => prev ? {
          ...prev,
          insights: result.insights.map((i: Insight, idx: number) => ({
            ...i,
            id: `new-${idx}`,
            createdAt: result.generatedAt,
          })),
        } : null)
      }
    } catch (err) {
      console.error('Failed to generate insights:', err)
    } finally {
      setIsGeneratingInsights(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D9FF]"></div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl text-white mb-4">{error || 'Account not found'}</h2>
          <Link href="/dashboard/spy-mode" className="text-[#00D9FF]">
            ← Back to Spy Mode
          </Link>
        </div>
      </div>
    )
  }

  const { account, analytics, bestPosts, recentPosts, insights } = data

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      {/* Dot Grid Background */}
      <div className="dot-grid-background">
        <div className="dot-grid-container">
          <div className="dot-grid"></div>
          <div className="dot-grid-overlay"></div>
        </div>
      </div>

      {/* Logo */}
      <div className="absolute top-6 z-20 px-4 sm:px-6 lg:px-8 max-w-7xl left-1/2 -translate-x-1/2 w-full">
        <Link href="/">
          <Image
            src="/logo.png"
            alt="Redoit Logo"
            width={199}
            height={79}
            className="object-contain cursor-pointer"
          />
        </Link>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/spy-mode"
              className="text-gray-400 hover:text-white transition"
            >
              ← Back
            </Link>
            {account.avatarUrl ? (
              <img
                src={account.avatarUrl}
                alt={account.username}
                className="w-16 h-16 rounded-full border-2 border-[#00D9FF]/50"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00D9FF] to-cyan-600 flex items-center justify-center text-black font-bold text-2xl">
                {account.username[0].toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-white">u/{account.username}</h1>
              <p className="text-gray-400">
                {formatKarma(account.totalKarma)} karma • {analytics.totalPosts} posts analyzed
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              href={`/dashboard/spy-mode/compare?ids=${id}`}
              className="glass-button text-gray-300 px-4 py-2 rounded-lg transition"
            >
              📊 Compare
            </Link>
            <button
              onClick={generateInsights}
              disabled={isGeneratingInsights}
              className="bg-gradient-to-r from-[#00D9FF] to-cyan-500 text-black font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition disabled:opacity-50"
            >
              {isGeneratingInsights ? 'Analyzing...' : '🧠 AI Insights'}
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatCard label="Avg Score" value={formatNumber(analytics.avgScore)} />
          <StatCard label="Avg Comments" value={formatNumber(analytics.avgComments)} />
          <StatCard label="Posts/Week" value={analytics.postsPerWeek.toFixed(1)} />
          <StatCard label="Success Rate" value={`${analytics.successRate}%`} />
          <StatCard label="Subreddits" value={analytics.topSubreddits.length.toString()} />
        </div>

        {/* Main Content Grid */}
        <div className="space-y-6">
          {/* Performance Chart - Full Width */}
          <div className="feature-card rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Performance Over Time</h2>
            <PerformanceChart data={analytics.recentTrend} />
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Posting Heatmap */}
            <div className="feature-card rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Posting Schedule</h2>
              <PostingHeatmap data={analytics.postingHeatmap} />
            </div>

            {/* Subreddit Breakdown */}
            <div className="feature-card rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Subreddit Focus</h2>
              <SubredditBreakdown data={analytics.topSubreddits} />
            </div>
          </div>

          {/* Posts Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Best Posts */}
            <div className="feature-card rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">🏆 Best Posts</h2>
              <div className="space-y-3">
                {bestPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
                {bestPosts.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No posts yet</p>
                )}
              </div>
            </div>

            {/* Recent Posts */}
            <div className="feature-card rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">📅 Recent Posts</h2>
              <div className="space-y-3">
                {recentPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
                {recentPosts.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No posts yet</p>
                )}
              </div>
            </div>
          </div>

          {/* AI Insights */}
          <InsightPanel
            insights={insights}
            isLoading={isGeneratingInsights}
            onGenerate={generateInsights}
          />
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="spy-stat-card rounded-lg p-4 text-center">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p className="text-white font-bold text-xl">{value}</p>

      <style jsx>{`
        .spy-stat-card {
          background: linear-gradient(135deg, rgba(0, 217, 255, 0.05) 0%, rgba(18, 18, 26, 0.9) 100%);
          border: 1px solid rgba(0, 217, 255, 0.2);
        }
      `}</style>
    </div>
  )
}

function PostCard({ post }: { post: Post }) {
  return (
    <a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-3 bg-[#1a1a24] border border-gray-700 rounded-lg hover:border-[#00D9FF]/50 transition"
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm truncate">{post.title}</p>
          <p className="text-gray-500 text-xs mt-1">
            r/{post.subreddit} • {new Date(post.postedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[#00D9FF] font-semibold">↑{formatNumber(post.score)}</p>
          <p className="text-gray-500 text-xs">{post.commentCount} 💬</p>
        </div>
      </div>
    </a>
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

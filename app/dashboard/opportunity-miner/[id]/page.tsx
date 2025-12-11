'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import DashboardNav from '@/components/DashboardNav'
import ScoreGauge from '@/components/opportunity-miner/ScoreGauge'
import CategoryBadge from '@/components/opportunity-miner/CategoryBadge'
import TrendIndicator from '@/components/opportunity-miner/TrendIndicator'
import ActionButtons from '@/components/opportunity-miner/ActionButtons'

type OpportunityCategory =
  | 'PAIN_POINT'
  | 'FEATURE_REQUEST'
  | 'CONTENT_OPPORTUNITY'
  | 'COMPETITOR_GAP'
  | 'TRENDING_TOPIC'

type OpportunityStatus = 'NEW' | 'TRACKING' | 'ACTED_ON' | 'ARCHIVED'
type TrendDirection = 'GROWING' | 'STABLE' | 'DECLINING'

interface Evidence {
  id: string
  redditPostId: string
  redditPostUrl: string
  quoteText: string
  author: string
  subreddit: string
  upvotes: number
  commentCount: number
  sentimentScore: number | null
  postedAt: string
  createdAt: string
}

interface Opportunity {
  id: string
  title: string
  category: OpportunityCategory
  score: number
  problemStatement: string
  evidenceCount: number
  trendDirection: TrendDirection
  status: OpportunityStatus
  firstSeenAt: string
  lastUpdatedAt: string
  metadata: {
    scoreBreakdown?: {
      frequency: number
      engagement: number
      sentiment: number
      trend: number
      marketGap: number
      total: number
    }
    themes?: string[]
    keywords?: string[]
  }
  subreddits: { subreddit: string; mentionCount: number }[]
  evidence: Evidence[]
}

const statusOptions: { value: OpportunityStatus; label: string }[] = [
  { value: 'NEW', label: 'New' },
  { value: 'TRACKING', label: 'Tracking' },
  { value: 'ACTED_ON', label: 'Acted On' },
  { value: 'ARCHIVED', label: 'Archived' },
]

export default function OpportunityDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showScoreTooltip, setShowScoreTooltip] = useState(false)

  const fetchOpportunity = useCallback(async () => {
    try {
      const response = await fetch(`/api/opportunities/${id}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch opportunity')
      }

      // API returns { opportunity: {...} } - extract the nested object
      const opportunityData = data.opportunity || data
      setOpportunity(opportunityData)
      setEvidence(opportunityData.evidence || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) {
      fetchOpportunity()
    }
  }, [id, fetchOpportunity])

  const updateStatus = async (newStatus: OpportunityStatus) => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/opportunities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        setOpportunity((prev) => (prev ? { ...prev, status: newStatus } : null))
      }
    } catch (err) {
      console.error('Failed to update status:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  const deleteOpportunity = async () => {
    if (!confirm('Are you sure you want to delete this opportunity?')) return

    try {
      const response = await fetch(`/api/opportunities/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push('/dashboard/opportunity-miner')
      }
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D9FF]"></div>
      </div>
    )
  }

  if (error || !opportunity) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-xl text-white mb-2">
            {error || 'Opportunity not found'}
          </h2>
          <Link
            href="/dashboard/opportunity-miner"
            className="text-[#00D9FF] hover:underline"
          >
            ← Back to Opportunities
          </Link>
        </div>
      </div>
    )
  }

  const scoreBreakdown = opportunity.metadata?.scoreBreakdown

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

        {/* Back Link */}
        <Link
          href="/dashboard/opportunity-miner"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition"
        >
          ← Back to Opportunities
        </Link>

        {/* Header Section */}
        <div className="detail-card rounded-xl p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: Score + Category */}
            <div className="flex items-start gap-4">
              <ScoreGauge score={opportunity.score} size="lg" />
              <div>
                <CategoryBadge category={opportunity.category} />
                <div className="flex items-center gap-2 mt-2">
                  <TrendIndicator
                    trend={opportunity.trendDirection}
                    showLabel
                  />
                  <span className="text-gray-500 text-sm">
                    • {opportunity.evidenceCount} evidence points
                  </span>
                </div>
              </div>
            </div>

            {/* Center: Title + Description */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white mb-3">
                {opportunity.title}
              </h1>
              <p className="text-gray-300">{opportunity.problemStatement}</p>

              {/* Themes & Keywords */}
              {(opportunity.metadata?.themes?.length ||
                opportunity.metadata?.keywords?.length) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {opportunity.metadata?.themes?.map((theme) => (
                    <span
                      key={theme}
                      className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs"
                    >
                      #{theme}
                    </span>
                  ))}
                  {opportunity.metadata?.keywords?.map((kw) => (
                    <span
                      key={kw}
                      className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex flex-col gap-3 min-w-[180px]">
              <ActionButtons
                opportunityId={opportunity.id}
                currentStatus={opportunity.status}
                onStatusChange={(newStatus) =>
                  setOpportunity((prev) =>
                    prev ? { ...prev, status: newStatus } : null
                  )
                }
              />
              <select
                value={opportunity.status}
                onChange={(e) =>
                  updateStatus(e.target.value as OpportunityStatus)
                }
                disabled={isUpdating}
                className="px-4 py-2 border border-gray-600 bg-[#12121a] rounded-lg text-white"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                onClick={deleteOpportunity}
                className="px-4 py-2 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/20 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Score Breakdown + Subreddits */}
          <div className="space-y-6">
            {/* Score Breakdown */}
            {scoreBreakdown && (
              <div className="detail-card rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4 relative">
                  <h3 className="text-lg font-semibold text-white">
                    Score Breakdown
                  </h3>
                  <button
                    onMouseEnter={() => setShowScoreTooltip(true)}
                    onMouseLeave={() => setShowScoreTooltip(false)}
                    onClick={() => setShowScoreTooltip(!showScoreTooltip)}
                    className="text-gray-400 hover:text-[#00D9FF] transition cursor-help"
                    aria-label="What do these scores mean?"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {showScoreTooltip && (
                    <div className="absolute left-0 top-8 z-50 w-72 p-4 bg-[#1a1a24] border border-[#00D9FF]/30 rounded-lg shadow-xl">
                      <h4 className="text-[#00D9FF] font-semibold mb-3 text-sm">What These Scores Mean</h4>
                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-white font-medium">Frequency (30%)</span>
                          <p className="text-gray-400">How often this problem is mentioned. More mentions = higher score.</p>
                        </div>
                        <div>
                          <span className="text-white font-medium">Engagement (25%)</span>
                          <p className="text-gray-400">Average upvotes and comments on related posts.</p>
                        </div>
                        <div>
                          <span className="text-white font-medium">Sentiment (20%)</span>
                          <p className="text-gray-400">Emotional intensity. Strong frustration or excitement scores higher.</p>
                        </div>
                        <div>
                          <span className="text-white font-medium">Trend (15%)</span>
                          <p className="text-gray-400">Is it growing? Compares recent mentions vs older ones.</p>
                        </div>
                        <div>
                          <span className="text-white font-medium">Market Gap (10%)</span>
                          <p className="text-gray-400">Are competitors mentioned negatively? Are there unmet needs?</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  {[
                    {
                      label: 'Frequency',
                      value: scoreBreakdown.frequency,
                      weight: '30%',
                    },
                    {
                      label: 'Engagement',
                      value: scoreBreakdown.engagement,
                      weight: '25%',
                    },
                    {
                      label: 'Sentiment',
                      value: scoreBreakdown.sentiment,
                      weight: '20%',
                    },
                    {
                      label: 'Trend',
                      value: scoreBreakdown.trend,
                      weight: '15%',
                    },
                    {
                      label: 'Market Gap',
                      value: scoreBreakdown.marketGap,
                      weight: '10%',
                    },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">
                          {item.label}{' '}
                          <span className="text-gray-600">({item.weight})</span>
                        </span>
                        <span className="text-white">{item.value}</span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#00D9FF] to-cyan-500 rounded-full transition-all"
                          style={{ width: `${item.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subreddits */}
            <div className="detail-card rounded-xl p-5">
              <h3 className="text-lg font-semibold text-white mb-4">
                Subreddits ({opportunity.subreddits?.length || 0})
              </h3>
              <div className="space-y-2">
                {opportunity.subreddits?.map((sub) => (
                  <div
                    key={sub.subreddit}
                    className="flex justify-between items-center p-2 bg-[#1a1a24] rounded"
                  >
                    <a
                      href={`https://reddit.com/r/${sub.subreddit}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#00D9FF] hover:underline"
                    >
                      r/{sub.subreddit}
                    </a>
                    <span className="text-gray-400 text-sm">
                      {sub.mentionCount} mentions
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timestamps */}
            <div className="detail-card rounded-xl p-5">
              <h3 className="text-lg font-semibold text-white mb-4">
                Timeline
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">First Seen</span>
                  <span className="text-white">
                    {new Date(opportunity.firstSeenAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Last Updated</span>
                  <span className="text-white">
                    {new Date(opportunity.lastUpdatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Evidence */}
          <div className="lg:col-span-2">
            <div className="detail-card rounded-xl p-5">
              <h3 className="text-lg font-semibold text-white mb-4">
                Evidence ({evidence.length})
              </h3>

              {evidence.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  No evidence collected yet
                </p>
              ) : (
                <div className="space-y-4">
                  {evidence.map((e) => (
                    <div
                      key={e.id}
                      className="evidence-item p-4 rounded-lg border border-gray-700/50"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <a
                            href={`https://reddit.com/u/${e.author}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#00D9FF] hover:underline text-sm"
                          >
                            u/{e.author}
                          </a>
                          <span className="text-gray-500 text-xs">
                            in r/{e.subreddit}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>↑ {e.upvotes}</span>
                          <span>💬 {e.commentCount}</span>
                          {e.sentimentScore !== null && (
                            <span
                              className={
                                e.sentimentScore < 0
                                  ? 'text-red-400'
                                  : e.sentimentScore > 0
                                  ? 'text-green-400'
                                  : 'text-gray-400'
                              }
                            >
                              {e.sentimentScore > 0 ? '+' : ''}
                              {(e.sentimentScore * 100).toFixed(0)}% sentiment
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-gray-300 text-sm mb-3 line-clamp-4">
                        {e.quoteText}
                      </p>

                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-xs">
                          {new Date(e.postedAt).toLocaleDateString()}
                        </span>
                        <a
                          href={e.redditPostUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#00D9FF] text-xs hover:underline"
                        >
                          View on Reddit →
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .detail-card {
          background: linear-gradient(
            135deg,
            rgba(0, 217, 255, 0.05) 0%,
            rgba(18, 18, 26, 0.9) 100%
          );
          border: 1px solid rgba(0, 217, 255, 0.2);
          backdrop-filter: blur(12px);
        }
        .evidence-item {
          background: rgba(18, 18, 26, 0.6);
          transition: all 0.2s ease;
        }
        .evidence-item:hover {
          background: rgba(18, 18, 26, 0.8);
          border-color: rgba(0, 217, 255, 0.3);
        }
      `}</style>
    </div>
  )
}

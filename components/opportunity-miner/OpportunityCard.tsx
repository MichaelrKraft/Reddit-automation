'use client'

import Link from 'next/link'
import ScoreGauge from './ScoreGauge'
import CategoryBadge from './CategoryBadge'
import TrendIndicator from './TrendIndicator'

type OpportunityCategory =
  | 'PAIN_POINT'
  | 'FEATURE_REQUEST'
  | 'CONTENT_OPPORTUNITY'
  | 'COMPETITOR_GAP'
  | 'TRENDING_TOPIC'

type TrendDirection = 'GROWING' | 'STABLE' | 'DECLINING'

type OpportunityStatus = 'NEW' | 'TRACKING' | 'ACTED_ON' | 'ARCHIVED'

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
  earliestPostDate?: string | null
  subreddits?: { subreddit: string; mentionCount: number }[]
}

interface OpportunityCardProps {
  opportunity: Opportunity
  onStatusChange?: (id: string, status: OpportunityStatus) => void
  onDismiss?: (id: string) => void
}

const statusColors: Record<OpportunityStatus, string> = {
  NEW: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  TRACKING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  ACTED_ON: 'bg-green-500/20 text-green-400 border-green-500/40',
  ARCHIVED: 'bg-gray-500/20 text-gray-400 border-gray-500/40',
}

export default function OpportunityCard({
  opportunity,
  onStatusChange,
  onDismiss,
}: OpportunityCardProps) {
  const topSubreddits = opportunity.subreddits?.slice(0, 3) || []

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onDismiss) {
      onDismiss(opportunity.id)
    }
  }

  return (
    <div className="relative group">
      {/* Dismiss X button */}
      {onDismiss && (
        <button
          onClick={handleDismiss}
          className="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full bg-gray-700 hover:bg-red-500 text-gray-400 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
          title="Dismiss this opportunity"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )}
      <Link href={`/dashboard/opportunity-miner/${opportunity.id}`}>
        <div className="opportunity-card rounded-xl p-5 cursor-pointer h-full">
          {/* Header: Score + Category + Trend */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <ScoreGauge score={opportunity.score} size="md" />
              <div>
                <CategoryBadge category={opportunity.category} />
                <div className="flex items-center gap-2 mt-1">
                  <TrendIndicator trend={opportunity.trendDirection} showLabel />
                  <span className="text-xs text-gray-500">
                    {opportunity.evidenceCount} evidence
                  </span>
                </div>
              </div>
            </div>
            <span
              className={`text-xs px-2 py-1 rounded-full border ${statusColors[opportunity.status]}`}
            >
              {opportunity.status.replace('_', ' ')}
            </span>
          </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
          {opportunity.title}
        </h3>

        {/* Problem Statement */}
        <p className="text-gray-400 text-sm line-clamp-2 mb-3">
          {opportunity.problemStatement}
        </p>

        {/* Subreddits */}
        {topSubreddits.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {topSubreddits.map((sub) => (
              <span
                key={sub.subreddit}
                className="text-xs bg-[#1a1a24] text-[#00D9FF] px-2 py-0.5 rounded"
              >
                r/{sub.subreddit}
              </span>
            ))}
            {(opportunity.subreddits?.length || 0) > 3 && (
              <span className="text-xs text-gray-500">
                +{(opportunity.subreddits?.length || 0) - 3} more
              </span>
            )}
          </div>
        )}

          {/* Footer: Timestamps */}
          <div className="text-xs text-gray-500 pt-2 border-t border-gray-700/50 space-y-1">
            {opportunity.earliestPostDate && (
              <div className="flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                </svg>
                <span className="text-orange-400">
                  Posted:{' '}
                  {new Date(opportunity.earliestPostDate).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span>
                First seen:{' '}
                {new Date(opportunity.firstSeenAt).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
              <span>
                Updated:{' '}
                {new Date(opportunity.lastUpdatedAt).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
}

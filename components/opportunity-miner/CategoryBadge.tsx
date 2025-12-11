'use client'

type OpportunityCategory =
  | 'PAIN_POINT'
  | 'FEATURE_REQUEST'
  | 'CONTENT_OPPORTUNITY'
  | 'COMPETITOR_GAP'
  | 'TRENDING_TOPIC'

interface CategoryBadgeProps {
  category: OpportunityCategory
}

const categoryConfig: Record<
  OpportunityCategory,
  { label: string; color: string; icon: string }
> = {
  PAIN_POINT: {
    label: 'Pain Point',
    color: 'bg-red-500/20 text-red-400 border-red-500/40',
    icon: '🔥',
  },
  FEATURE_REQUEST: {
    label: 'Feature Request',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
    icon: '✨',
  },
  CONTENT_OPPORTUNITY: {
    label: 'Content Gap',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    icon: '📝',
  },
  COMPETITOR_GAP: {
    label: 'Competitor Gap',
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
    icon: '🎯',
  },
  TRENDING_TOPIC: {
    label: 'Trending',
    color: 'bg-green-500/20 text-green-400 border-green-500/40',
    icon: '📈',
  },
}

export default function CategoryBadge({ category }: CategoryBadgeProps) {
  const config = categoryConfig[category] || categoryConfig.CONTENT_OPPORTUNITY

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}
    >
      <span>{config.icon}</span>
      {config.label}
    </span>
  )
}

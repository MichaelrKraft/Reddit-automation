'use client'

type TrendDirection = 'GROWING' | 'STABLE' | 'DECLINING'

interface TrendIndicatorProps {
  trend: TrendDirection
  showLabel?: boolean
}

const trendConfig: Record<
  TrendDirection,
  { label: string; color: string; icon: string }
> = {
  GROWING: {
    label: 'Growing',
    color: 'text-green-400',
    icon: '↑',
  },
  STABLE: {
    label: 'Stable',
    color: 'text-gray-400',
    icon: '→',
  },
  DECLINING: {
    label: 'Declining',
    color: 'text-red-400',
    icon: '↓',
  },
}

export default function TrendIndicator({
  trend,
  showLabel = false,
}: TrendIndicatorProps) {
  const config = trendConfig[trend] || trendConfig.STABLE

  return (
    <span className={`inline-flex items-center gap-1 ${config.color}`}>
      <span className="text-lg font-bold">{config.icon}</span>
      {showLabel && <span className="text-xs">{config.label}</span>}
    </span>
  )
}

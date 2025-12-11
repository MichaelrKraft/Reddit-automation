'use client'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: string
  trend?: {
    value: number
    label: string
  }
}

export default function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
}: StatsCardProps) {
  return (
    <div className="stats-card rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm mb-1">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {subtitle && (
            <p className="text-gray-500 text-xs mt-1">{subtitle}</p>
          )}
          {trend && (
            <p
              className={`text-xs mt-1 ${
                trend.value >= 0 ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {trend.value >= 0 ? '+' : ''}
              {trend.value}% {trend.label}
            </p>
          )}
        </div>
        {icon && <span className="text-3xl">{icon}</span>}
      </div>
    </div>
  )
}

'use client'

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'

interface RadarMetrics {
  engagement: number
  consistency: number
  volume: number
  successRate: number
  timing: number
  diversity: number
}

interface ComparisonAccount {
  id: string
  username: string
  radarMetrics: RadarMetrics
}

interface RadarComparisonProps {
  accounts: ComparisonAccount[]
}

const COLORS = ['#00D9FF', '#F97316', '#8B5CF6', '#10B981']

const metricLabels: Record<keyof RadarMetrics, string> = {
  engagement: 'Engagement',
  consistency: 'Consistency',
  volume: 'Volume',
  successRate: 'Success Rate',
  timing: 'Timing',
  diversity: 'Diversity',
}

export default function RadarComparison({ accounts }: RadarComparisonProps) {
  if (accounts.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center text-gray-500">
        No accounts to compare.
      </div>
    )
  }

  // Transform data for Recharts
  const metrics: (keyof RadarMetrics)[] = [
    'engagement',
    'consistency',
    'volume',
    'successRate',
    'timing',
    'diversity',
  ]

  const chartData = metrics.map((metric) => {
    const point: Record<string, string | number> = {
      metric: metricLabels[metric],
    }

    accounts.forEach((account) => {
      point[account.username] = account.radarMetrics[metric]
    })

    return point
  })

  return (
    <div className="h-96">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="80%">
          <PolarGrid stroke="#333" />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fill: '#888', fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: '#666', fontSize: 10 }}
            axisLine={false}
          />
          {accounts.map((account, index) => (
            <Radar
              key={account.id}
              name={`u/${account.username}`}
              dataKey={account.username}
              stroke={COLORS[index % COLORS.length]}
              fill={COLORS[index % COLORS.length]}
              fillOpacity={0.2}
              strokeWidth={2}
            />
          ))}
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={(value) => (
              <span className="text-gray-300">{value}</span>
            )}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1a24',
              border: '1px solid rgba(0, 217, 255, 0.3)',
              borderRadius: '8px',
              color: '#fff',
            }}
            formatter={(value: number) => [`${value}/100`, '']}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

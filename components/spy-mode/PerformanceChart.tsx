'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface PerformanceChartProps {
  data: number[] // 7 days of score data
}

export default function PerformanceChart({ data }: PerformanceChartProps) {
  // Create chart data from last 7 days
  const chartData = data.map((score, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - index))
    return {
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score,
    }
  })

  if (data.length === 0 || data.every(d => d === 0)) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No performance data yet. Check back after posts are tracked.
      </div>
    )
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00D9FF" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#00D9FF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="day"
            stroke="#666"
            tick={{ fill: '#888', fontSize: 12 }}
          />
          <YAxis
            stroke="#666"
            tick={{ fill: '#888', fontSize: 12 }}
            tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1a24',
              border: '1px solid rgba(0, 217, 255, 0.3)',
              borderRadius: '8px',
              color: '#fff',
            }}
            labelStyle={{ color: '#00D9FF' }}
            formatter={(value: number) => [value.toLocaleString(), 'Total Score']}
            labelFormatter={(label, payload) =>
              payload[0]?.payload?.date || label
            }
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#00D9FF"
            strokeWidth={2}
            fill="url(#scoreGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

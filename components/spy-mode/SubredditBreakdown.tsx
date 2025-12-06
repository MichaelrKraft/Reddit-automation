'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface SubredditData {
  name: string
  count: number
  avgScore: number
}

interface SubredditBreakdownProps {
  data: SubredditData[]
}

const COLORS = [
  '#00D9FF', // cyan
  '#06B6D4', // cyan-500
  '#0EA5E9', // sky-500
  '#3B82F6', // blue-500
  '#8B5CF6', // violet-500
  '#A855F7', // purple-500
  '#D946EF', // fuchsia-500
  '#EC4899', // pink-500
  '#F43F5E', // rose-500
  '#F97316', // orange-500
]

export default function SubredditBreakdown({ data }: SubredditBreakdownProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No subreddit data yet.
      </div>
    )
  }

  const totalPosts = data.reduce((sum, d) => sum + d.count, 0)

  // Prepare chart data
  const chartData = data.slice(0, 8).map(d => ({
    name: `r/${d.name}`,
    value: d.count,
    avgScore: d.avgScore,
    percentage: Math.round((d.count / totalPosts) * 100),
  }))

  // Add "Other" if there are more than 8 subreddits
  if (data.length > 8) {
    const otherCount = data.slice(8).reduce((sum, d) => sum + d.count, 0)
    chartData.push({
      name: 'Other',
      value: otherCount,
      avgScore: 0,
      percentage: Math.round((otherCount / totalPosts) * 100),
    })
  }

  return (
    <div className="h-64 flex items-center">
      {/* Chart */}
      <div className="w-1/2 h-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  stroke="transparent"
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1a24',
                border: '1px solid rgba(0, 217, 255, 0.3)',
                borderRadius: '8px',
                color: '#fff',
              }}
              formatter={(value: number, name: string, props: { payload: typeof chartData[0] }) => [
                `${value} posts (${props.payload.percentage}%)`,
                name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="w-1/2 space-y-2 pl-4">
        {chartData.slice(0, 6).map((item, index) => (
          <div key={item.name} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-gray-300 truncate flex-1">{item.name}</span>
            <span className="text-gray-500">{item.percentage}%</span>
          </div>
        ))}
        {chartData.length > 6 && (
          <p className="text-xs text-gray-500 pl-5">
            +{chartData.length - 6} more
          </p>
        )}
      </div>
    </div>
  )
}

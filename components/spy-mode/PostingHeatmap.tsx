'use client'

interface HeatmapData {
  day: number // 0-6 (Sun-Sat)
  hour: number // 0-23
  count: number
  avgScore: number
}

interface PostingHeatmapProps {
  data: HeatmapData[]
}

export default function PostingHeatmap({ data }: PostingHeatmapProps) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const hours = Array.from({ length: 24 }, (_, i) => i)

  // Create a map for quick lookup
  const dataMap = new Map<string, HeatmapData>()
  data.forEach(d => {
    dataMap.set(`${d.day}-${d.hour}`, d)
  })

  // Find max values for color scaling
  const maxCount = Math.max(...data.map(d => d.count), 1)
  const maxScore = Math.max(...data.map(d => d.avgScore), 1)

  // Get color based on count and score
  const getColor = (day: number, hour: number): string => {
    const item = dataMap.get(`${day}-${hour}`)
    if (!item || item.count === 0) return 'rgba(75, 85, 99, 0.3)' // gray-600/30

    // Blend between cyan (activity) and orange (high score)
    const intensity = item.count / maxCount
    const scoreIntensity = item.avgScore / maxScore

    if (scoreIntensity > 0.7) {
      // High performance - orange
      return `rgba(249, 115, 22, ${0.3 + intensity * 0.6})`
    }
    // Normal activity - cyan
    return `rgba(0, 217, 255, ${0.2 + intensity * 0.6})`
  }

  const getTooltip = (day: number, hour: number): string => {
    const item = dataMap.get(`${day}-${hour}`)
    if (!item || item.count === 0) return 'No posts'
    return `${item.count} posts, avg ${item.avgScore} score`
  }

  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-500">
        No posting pattern data yet.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Hour labels */}
        <div className="flex mb-2">
          <div className="w-10"></div>
          {hours.filter(h => h % 3 === 0).map(hour => (
            <div
              key={hour}
              className="text-xs text-gray-500 text-center"
              style={{ width: `${100 / 8}%` }}
            >
              {hour}:00
            </div>
          ))}
        </div>

        {/* Heatmap grid */}
        {days.map((day, dayIndex) => (
          <div key={day} className="flex items-center mb-1">
            <div className="w-10 text-xs text-gray-500">{day}</div>
            <div className="flex-1 flex gap-0.5">
              {hours.map(hour => (
                <div
                  key={hour}
                  className="flex-1 h-6 rounded-sm cursor-default transition-transform hover:scale-110"
                  style={{ backgroundColor: getColor(dayIndex, hour) }}
                  title={`${day} ${hour}:00 - ${getTooltip(dayIndex, hour)}`}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(0, 217, 255, 0.5)' }}></div>
            <span>Active</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(249, 115, 22, 0.7)' }}></div>
            <span>High Performance</span>
          </div>
        </div>
      </div>
    </div>
  )
}

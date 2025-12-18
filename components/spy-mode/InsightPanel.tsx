'use client'

interface Insight {
  id: string
  insightType: string
  title: string
  description: string
  actionItems: string[]
  confidence: number
  createdAt: string
}

interface InsightPanelProps {
  insights: Insight[]
  isLoading: boolean
  onGenerate: () => void
}

const insightIcons: Record<string, string> = {
  pattern: '',
  timing: '',
  subreddit: '',
  recommendation: '',
}

const insightColors: Record<string, string> = {
  pattern: 'border-blue-500/50 bg-blue-500/10',
  timing: 'border-orange-500/50 bg-orange-500/10',
  subreddit: 'border-purple-500/50 bg-purple-500/10',
  recommendation: 'border-[#00D9FF]/50 bg-[#00D9FF]/10',
}

export default function InsightPanel({ insights, isLoading, onGenerate }: InsightPanelProps) {
  if (insights.length === 0 && !isLoading) {
    return (
      <div className="feature-card rounded-lg p-6">
        <div className="text-center py-8">
          <h3 className="text-lg font-semibold text-white mb-2">
            AI Insights Available
          </h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Click the button below to generate AI-powered insights about this
            account&apos;s posting strategy and success patterns.
          </p>
          <button
            onClick={onGenerate}
            disabled={isLoading}
            className="bg-gradient-to-r from-[#00D9FF] to-cyan-500 text-black font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition disabled:opacity-50"
          >
            {isLoading ? 'Analyzing...' : 'Generate AI Insights'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="feature-card rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">
          AI Insights
        </h2>
        <button
          onClick={onGenerate}
          disabled={isLoading}
          className="text-sm text-[#00D9FF] hover:text-cyan-400 transition disabled:opacity-50"
        >
          {isLoading ? 'Regenerating...' : '↻ Regenerate'}
        </button>
      </div>

      {isLoading && insights.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="border border-gray-700 rounded-lg p-4 animate-pulse"
            >
              <div className="h-4 bg-gray-700 rounded w-1/3 mb-3"></div>
              <div className="h-3 bg-gray-700 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-4/5"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className={`border rounded-lg p-4 transition hover:scale-[1.01] ${
                insightColors[insight.insightType] || 'border-gray-700 bg-gray-700/10'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-semibold">{insight.title}</h3>
                    <span className="text-xs text-gray-500">
                      {Math.round(insight.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm mb-3">
                    {insight.description}
                  </p>
                  {insight.actionItems && insight.actionItems.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        Action Items
                      </p>
                      <ul className="space-y-1">
                        {insight.actionItems.map((item, idx) => (
                          <li
                            key={idx}
                            className="text-sm text-gray-400 flex items-start gap-2"
                          >
                            <span className="text-[#00D9FF]">→</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

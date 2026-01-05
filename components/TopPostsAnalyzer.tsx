'use client'

import { useState } from 'react'

interface TopPost {
  title: string
  score: number
  numComments: number
  permalink: string
}

interface PatternAnalysis {
  patterns: {
    titlePatterns: string[]
    contentPatterns: string[]
    emotionalHooks: string[]
    formatPatterns: string[]
  }
  insights: {
    avgTitleLength: number
    avgContentLength: number
    commonOpenings: string[]
    topicThemes: string[]
  }
  recommendations: string[]
}

interface GeneratedPost {
  title: string
  content: string
  reasoning: string
  viralScore: number
}

interface TopPostsAnalyzerProps {
  subreddit: string
  onSelectPost?: (title: string, content: string) => void
}

const TIME_FILTERS = [
  { value: 'all', label: 'All Time' },
  { value: 'year', label: 'Past Year' },
  { value: 'month', label: 'Past Month' },
  { value: 'week', label: 'Past Week' },
  { value: 'day', label: 'Past 24 Hours' },
]

export default function TopPostsAnalyzer({ subreddit, onSelectPost }: TopPostsAnalyzerProps) {
  const [timeFilter, setTimeFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [topPosts, setTopPosts] = useState<TopPost[]>([])
  const [analysis, setAnalysis] = useState<PatternAnalysis | null>(null)
  const [userGoal, setUserGoal] = useState('')
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>([])
  const [showAnalysis, setShowAnalysis] = useState(false)

  async function analyzeTopPosts() {
    if (!subreddit.trim()) return

    setLoading(true)
    setError(null)
    setGeneratedPosts([])

    try {
      const response = await fetch('/api/ai/analyze-top-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subreddit,
          timeFilter,
          limit: 25
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to analyze top posts')
      }

      const data = await response.json()
      setTopPosts(data.topPosts || [])
      setAnalysis(data.analysis)
      setShowAnalysis(true)
    } catch (err: any) {
      console.error('Analysis failed:', err)
      setError(err.message || 'Failed to analyze top posts')
    } finally {
      setLoading(false)
    }
  }

  async function generateFromPatterns() {
    if (!analysis || !userGoal.trim()) return

    setGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/analyze-top-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subreddit,
          timeFilter,
          limit: 25,
          userGoal,
          generatePost: true,
          postType: 'text'
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate posts')
      }

      const data = await response.json()
      setGeneratedPosts(data.generatedPosts || [])
    } catch (err: any) {
      console.error('Generation failed:', err)
      setError(err.message || 'Failed to generate posts')
    } finally {
      setGenerating(false)
    }
  }

  if (!subreddit.trim()) return null

  return (
    <div className="feature-card rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏆</span>
          <h4 className="font-semibold text-white">Top Posts Analyzer</h4>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="text-sm bg-[#12121a] text-gray-300 border border-gray-700 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#00D9FF]"
          >
            {TIME_FILTERS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={analyzeTopPosts}
            disabled={loading}
            className="text-sm bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-4 py-2 rounded-lg hover:bg-[#00D9FF]/30 transition disabled:opacity-50"
          >
            {loading ? 'Analyzing...' : showAnalysis ? 'Refresh' : 'Analyze Top Posts'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Top Posts Preview */}
      {topPosts.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-gray-300">Top Performing Posts:</h5>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {topPosts.map((post, i) => (
              <a
                key={i}
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-2 bg-[#0a0a0f] rounded border border-gray-800 hover:border-[#00D9FF]/50 transition"
              >
                <p className="text-sm text-gray-200 line-clamp-1">{post.title}</p>
                <div className="flex gap-4 mt-1 text-xs text-gray-500">
                  <span>⬆️ {post.score.toLocaleString()}</span>
                  <span>💬 {post.numComments.toLocaleString()}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Pattern Analysis */}
      {analysis && showAnalysis && (
        <div className="space-y-3 border-t border-gray-800 pt-4">
          <h5 className="text-sm font-medium text-gray-300">🧠 AI Pattern Analysis:</h5>

          {/* Title Patterns */}
          <div>
            <strong className="text-[#00D9FF] text-sm">Title Patterns:</strong>
            <ul className="list-disc list-inside text-gray-400 text-sm mt-1">
              {analysis.patterns.titlePatterns.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>

          {/* Emotional Hooks */}
          <div>
            <strong className="text-orange-400 text-sm">Emotional Hooks:</strong>
            <ul className="list-disc list-inside text-gray-400 text-sm mt-1">
              {analysis.patterns.emotionalHooks.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </div>

          {/* Topic Themes */}
          <div>
            <strong className="text-green-400 text-sm">Popular Themes:</strong>
            <div className="flex flex-wrap gap-2 mt-1">
              {analysis.insights.topicThemes.map((t, i) => (
                <span key={i} className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <strong className="text-purple-400 text-sm">Recommendations:</strong>
            <ul className="list-disc list-inside text-gray-400 text-sm mt-1">
              {analysis.recommendations.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Post Generation */}
      {analysis && showAnalysis && (
        <div className="space-y-3 border-t border-gray-800 pt-4">
          <h5 className="text-sm font-medium text-gray-300">✨ Generate Post from Patterns:</h5>
          <div className="flex gap-2">
            <input
              type="text"
              value={userGoal}
              onChange={(e) => setUserGoal(e.target.value)}
              placeholder="Enter your goal (e.g., 'promote my SaaS product')"
              className="flex-1 bg-[#0a0a0f] text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00D9FF]"
            />
            <button
              type="button"
              onClick={generateFromPatterns}
              disabled={generating || !userGoal.trim()}
              className="text-sm bg-[#00D9FF] text-black px-4 py-2 rounded-lg hover:bg-[#00D9FF]/80 transition disabled:opacity-50 font-medium"
            >
              {generating ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </div>
      )}

      {/* Generated Posts */}
      {generatedPosts.length > 0 && (
        <div className="space-y-3 border-t border-gray-800 pt-4">
          <h5 className="text-sm font-medium text-gray-300">📝 Generated Posts:</h5>
          <div className="space-y-3">
            {generatedPosts.map((post, i) => (
              <div key={i} className="p-3 bg-[#0a0a0f] rounded-lg border border-gray-800">
                <div className="flex justify-between items-start gap-2">
                  <h6 className="font-medium text-white text-sm">{post.title}</h6>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    post.viralScore >= 80 ? 'bg-green-500/20 text-green-400' :
                    post.viralScore >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {post.viralScore}%
                  </span>
                </div>
                <p className="text-gray-400 text-sm mt-2 line-clamp-3">{post.content}</p>
                <p className="text-gray-500 text-xs mt-2 italic">{post.reasoning}</p>
                {onSelectPost && (
                  <button
                    type="button"
                    onClick={() => onSelectPost(post.title, post.content)}
                    className="mt-2 text-xs bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/50 px-3 py-1 rounded hover:bg-[#00D9FF]/30 transition"
                  >
                    Use This Post
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

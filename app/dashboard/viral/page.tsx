'use client'

import { useState } from 'react'
import Link from 'next/link'
import DashboardNav from '@/components/DashboardNav'
import ViralBodyOptimizer from '@/components/ViralBodyOptimizer'

interface ScoreBreakdown {
  titleLength: number
  firstPerson: number
  questionFormat: number
  punctuation: number
  capitalization: number
  wordSimplicity: number
  powerWords: number
  semanticTheme: number
}

interface AnalysisResult {
  id: string
  score: number
  tier: 'ultra-viral' | 'highly-viral' | 'moderately-viral' | 'low-viral'
  breakdown: ScoreBreakdown
  suggestions: string[]
  improvedTitles: string[]
  expectedPerformance: {
    avgScore: number
    description: string
  }
}

const tierConfig = {
  'ultra-viral': {
    color: 'bg-gradient-to-r from-yellow-400 to-orange-500',
    textColor: 'text-yellow-600',
    label: 'Ultra-Viral 🔥',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
  },
  'highly-viral': {
    color: 'bg-gradient-to-r from-green-400 to-emerald-500',
    textColor: 'text-green-600',
    label: 'Highly Viral 🚀',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
  },
  'moderately-viral': {
    color: 'bg-gradient-to-r from-blue-400 to-indigo-500',
    textColor: 'text-blue-600',
    label: 'Moderate Potential 📈',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
  },
  'low-viral': {
    color: 'bg-gradient-to-r from-gray-400 to-gray-500',
    textColor: 'text-gray-600',
    label: 'Needs Improvement 📝',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-300',
  },
}

const breakdownLabels: Record<keyof ScoreBreakdown, { label: string; description: string }> = {
  titleLength: { label: 'Title Length', description: 'Optimal: 8-15 words' },
  firstPerson: { label: 'First-Person', description: '35% of viral posts use I/my/me' },
  questionFormat: { label: 'Statement vs Question', description: 'Statements get more upvotes' },
  punctuation: { label: 'Punctuation', description: 'Quotes and ellipsis boost engagement' },
  capitalization: { label: 'Capitalization', description: 'Sentence case is best' },
  wordSimplicity: { label: 'Word Simplicity', description: 'Avg 4.75 chars/word' },
  powerWords: { label: 'Power Words', description: 'you, people, just, never, realized' },
  semanticTheme: { label: 'Clear Theme', description: 'Relationship, advice, work, discovery' },
}

export default function ViralPage() {
  const [title, setTitle] = useState('')
  const [subreddit, setSubreddit] = useState('')
  const [postType, setPostType] = useState<'text' | 'image' | 'video' | 'link'>('text')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function analyzeTitle() {
    if (!title.trim()) {
      setError('Please enter a title to analyze')
      return
    }

    setIsAnalyzing(true)
    setError(null)

    try {
      const response = await fetch('/api/viral/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          subreddit: subreddit.trim() || 'general',
          postType,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Analysis failed')
        return
      }

      setResult(data)
    } catch (err) {
      setError('Failed to analyze title')
    } finally {
      setIsAnalyzing(false)
    }
  }

  function useAlternativeTitle(newTitle: string) {
    setTitle(newTitle)
    setResult(null)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      {/* Dot Grid Background */}
      <div className="dot-grid-background">
        <div className="dot-grid-container">
          <div className="dot-grid"></div>
          <div className="dot-grid-overlay"></div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardNav />
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">🎯 Viral Headline Optimizer</h1>
            <p className="text-gray-400 mt-1 text-sm sm:text-base">
              Analyze your headlines based on 4,944 viral Reddit posts
            </p>
          </div>
          <Link
            href="/dashboard"
            className="glass-button text-gray-300 px-4 sm:px-6 py-2 rounded-lg transition text-sm sm:text-base text-center"
          >
            ← Back
          </Link>
        </div>

        {/* Input Section */}
        <div className="feature-card rounded-lg p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Your Headline
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && analyzeTitle()}
                placeholder="Enter your post title to analyze..."
                className="w-full px-4 py-3 border border-gray-600 bg-[#12121a] rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg text-white placeholder-gray-500"
                maxLength={300}
              />
              <p className="text-xs text-gray-500 mt-1">
                {title.length}/300 characters • {title.split(/\s+/).filter(w => w).length} words
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Target Subreddit (optional)
                </label>
                <input
                  type="text"
                  value={subreddit}
                  onChange={(e) => setSubreddit(e.target.value)}
                  placeholder="e.g., r/startups"
                  className="w-full px-4 py-2 border border-gray-600 bg-[#12121a] rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white placeholder-gray-500 text-sm sm:text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Post Type
                </label>
                <select
                  value={postType}
                  onChange={(e) => setPostType(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-600 bg-[#12121a] rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white text-sm sm:text-base"
                >
                  <option value="text">Text Post</option>
                  <option value="image">Image Post</option>
                  <option value="video">Video Post</option>
                  <option value="link">Link Post</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/50 text-red-300 px-4 py-2 rounded-lg border border-red-700">
                {error}
              </div>
            )}

            <button
              onClick={analyzeTitle}
              disabled={isAnalyzing || !title.trim()}
              className="w-full bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 py-3 rounded-lg hover:bg-[#00D9FF]/30 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
            >
              {isAnalyzing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-[#00D9FF] border-t-transparent rounded-full animate-spin"></span>
                  Analyzing...
                </span>
              ) : (
                'Analyze Viral Potential'
              )}
            </button>
          </div>
        </div>

        {/* Results Section */}
        {result && (
          <div className="space-y-6">
            {/* Score Display */}
            <div className={`feature-card rounded-lg p-6 ${tierConfig[result.tier].borderColor} border-2`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Viral Score</h2>
                  <p className={`text-lg font-medium ${tierConfig[result.tier].textColor}`}>
                    {tierConfig[result.tier].label}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-5xl font-bold ${tierConfig[result.tier].textColor}`}>
                    {result.score}
                  </div>
                  <div className="text-sm text-gray-400">out of 100</div>
                </div>
              </div>

              {/* Score Bar */}
              <div className="mt-4">
                <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${tierConfig[result.tier].color} transition-all duration-500`}
                    style={{ width: `${result.score}%` }}
                  ></div>
                </div>
              </div>

              {/* Expected Performance */}
              <div className="mt-4 p-3 bg-[#1a1a24] rounded-lg">
                <p className="text-sm text-gray-300">
                  <strong>Expected Performance:</strong> {result.expectedPerformance.description}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Posts in this tier average {result.expectedPerformance.avgScore.toLocaleString()} score
                </p>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="feature-card rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Score Breakdown</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(Object.keys(result.breakdown) as Array<keyof ScoreBreakdown>).map((key) => {
                  const value = result.breakdown[key]
                  const info = breakdownLabels[key]
                  return (
                    <div key={key} className="border border-gray-700 bg-[#1a1a24] rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-white">{info.label}</span>
                        <span className={`font-bold ${
                          value >= 80 ? 'text-green-400' :
                          value >= 60 ? 'text-blue-400' :
                          value >= 40 ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {value}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            value >= 80 ? 'bg-green-500' :
                            value >= 60 ? 'bg-blue-500' :
                            value >= 40 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${value}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{info.description}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Suggestions */}
            {result.suggestions.length > 0 && (
              <div className="feature-card rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">💡 Improvement Suggestions</h3>
                <ul className="space-y-2">
                  {result.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-orange-500 mt-0.5">•</span>
                      <span className="text-gray-300">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Alternative Titles */}
            {result.improvedTitles.length > 0 && (
              <div className="feature-card rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">✨ AI-Generated Alternatives</h3>
                <div className="space-y-3">
                  {result.improvedTitles.map((altTitle, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border border-gray-700 bg-[#1a1a24] rounded-lg hover:border-orange-500 hover:bg-[#1f1f2a] transition cursor-pointer group"
                      onClick={() => useAlternativeTitle(altTitle)}
                    >
                      <p className="text-gray-300 flex-1">{altTitle}</p>
                      <button
                        className="ml-4 text-sm text-orange-500 opacity-0 group-hover:opacity-100 transition font-medium"
                      >
                        Use This →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tips Panel */}
            <div className="feature-card border border-[#00D9FF]/30 rounded-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-[#00D9FF] mb-3">📊 Based on Analysis of 4,944 Viral Posts</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-300">
                <div>
                  <strong className="text-white">Virality Tiers:</strong>
                  <ul className="mt-1 space-y-1">
                    <li>• Ultra-Viral (90-100): ~20,000 avg score</li>
                    <li>• Highly Viral (70-89): ~3,400 avg score</li>
                    <li>• Moderate (40-69): ~500 avg score</li>
                    <li>• Low (0-39): ~6 avg score</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-white">Key Factors:</strong>
                  <ul className="mt-1 space-y-1">
                    <li>• 35% of viral posts use first-person</li>
                    <li>• Statements beat questions for upvotes</li>
                    <li>• Simple words (4.75 chars avg) win</li>
                    <li>• Transformation arcs boost engagement</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-gray-700 my-8"></div>

        {/* Body Copy Optimizer Section */}
        <ViralBodyOptimizer />
      </div>
    </div>
  )
}

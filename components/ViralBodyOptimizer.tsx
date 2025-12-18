'use client'

import { useState } from 'react'

interface BodyScoreBreakdown {
  openingHook: number
  storyStructure: number
  paragraphFlow: number
  emotionalTriggers: number
  dialogueUsage: number
  lengthOptimization: number
  formatting: number
}

interface BodyAnalysisResult {
  score: number
  tier: 'ultra-viral' | 'highly-viral' | 'moderately-viral' | 'low-viral'
  breakdown: BodyScoreBreakdown
  suggestions: string[]
  improvedVersions: string[]
  expectedPerformance: {
    avgScore: number
    description: string
  }
  detectedPattern: string | null
}

const tierConfig = {
  'ultra-viral': {
    color: 'bg-gradient-to-r from-yellow-400 to-orange-500',
    textColor: 'text-yellow-600',
    label: 'Ultra-Viral Body Copy',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
  },
  'highly-viral': {
    color: 'bg-gradient-to-r from-green-400 to-emerald-500',
    textColor: 'text-green-600',
    label: 'Highly Engaging',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
  },
  'moderately-viral': {
    color: 'bg-gradient-to-r from-blue-400 to-indigo-500',
    textColor: 'text-blue-600',
    label: 'Moderate Potential',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
  },
  'low-viral': {
    color: 'bg-gradient-to-r from-gray-400 to-gray-500',
    textColor: 'text-gray-600',
    label: 'Needs Improvement',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-300',
  },
}

const breakdownLabels: Record<keyof BodyScoreBreakdown, { label: string; description: string }> = {
  openingHook: { label: 'Opening Hook', description: 'Emotional or context-setting opener' },
  storyStructure: { label: 'Story Structure', description: 'Hook → Build-up → Climax → Aftermath' },
  paragraphFlow: { label: 'Paragraph Flow', description: 'Optimal 3-5 sentences per paragraph' },
  emotionalTriggers: { label: 'Emotional Triggers', description: 'Reactions and first-person usage' },
  dialogueUsage: { label: 'Dialogue', description: '78% of viral posts include dialogue' },
  lengthOptimization: { label: 'Length', description: 'Optimal word count for post type' },
  formatting: { label: 'Formatting', description: 'TL;DR, line breaks, structure' },
}

export default function ViralBodyOptimizer() {
  const [content, setContent] = useState('')
  const [subreddit, setSubreddit] = useState('')
  const [postType, setPostType] = useState<'story' | 'aita' | 'confession' | 'revenge' | 'relationship'>('story')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<BodyAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function analyzeBody() {
    if (!content.trim()) {
      setError('Please enter body content to analyze')
      return
    }

    setIsAnalyzing(true)
    setError(null)

    try {
      const response = await fetch('/api/viral/analyze-body', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          subreddit: subreddit.trim() || 'general',
          postType,
          generateImproved: true,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Analysis failed')
        return
      }

      setResult(data)
    } catch (err) {
      setError('Failed to analyze body copy')
    } finally {
      setIsAnalyzing(false)
    }
  }

  function useImprovedVersion(improved: string) {
    setContent(improved)
    setResult(null)
  }

  const wordCount = content.trim().split(/\s+/).filter(w => w).length
  const paragraphCount = content.split(/\n\s*\n/).filter(p => p.trim()).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">📝</span> Viral Body Copy Optimizer
          </h2>
          <p className="text-gray-400 mt-1 text-sm">
            Analyze your post body based on patterns from viral Reddit posts
          </p>
        </div>
      </div>

      {/* Input Section */}
      <div className="feature-card rounded-lg p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Your Post Body
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste or write your post body here...

Example viral opening:
I have never been so mortified in my life. This literally happened two hours ago and I'm still shaking.

I (26F) live pretty close to my workplace..."
              className="w-full px-4 py-3 border border-gray-600 bg-[#12121a] rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white placeholder-gray-500 min-h-[200px] font-mono text-sm"
              rows={10}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{wordCount} words • {paragraphCount} paragraphs</span>
              <span>Recommended: 400-1200 words</span>
            </div>
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
                placeholder="e.g., tifu, AmItheAsshole"
                className="w-full px-4 py-2 border border-gray-600 bg-[#12121a] rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Post Type
              </label>
              <select
                value={postType}
                onChange={(e) => setPostType(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-600 bg-[#12121a] rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white"
              >
                <option value="story">Story / TIFU</option>
                <option value="aita">AITA / Judgment</option>
                <option value="confession">Confession</option>
                <option value="revenge">Revenge / Compliance</option>
                <option value="relationship">Relationship</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/50 text-red-300 px-4 py-2 rounded-lg border border-red-700">
              {error}
            </div>
          )}

          <button
            onClick={analyzeBody}
            disabled={isAnalyzing || !content.trim()}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg"
          >
            {isAnalyzing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Analyzing Body Copy...
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
                <h3 className="text-xl font-bold text-white">Body Copy Score</h3>
                <p className={`text-lg font-medium ${tierConfig[result.tier].textColor}`}>
                  {tierConfig[result.tier].label}
                </p>
                {result.detectedPattern && (
                  <span className="inline-block mt-2 px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">
                    Detected: {result.detectedPattern} pattern
                  </span>
                )}
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
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="feature-card rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Score Breakdown</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(Object.keys(result.breakdown) as Array<keyof BodyScoreBreakdown>).map((key) => {
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
              <h3 className="text-lg font-semibold text-white mb-4">Improvement Suggestions</h3>
              <ul className="space-y-2">
                {result.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-purple-500 mt-0.5">•</span>
                    <span className="text-gray-300">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improved Version */}
          {result.improvedVersions && result.improvedVersions.length > 0 && (
            <div className="feature-card rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">AI-Improved Version</h3>
              <div className="space-y-4">
                {result.improvedVersions.map((improved, index) => (
                  <div
                    key={index}
                    className="border border-gray-700 bg-[#1a1a24] rounded-lg p-4"
                  >
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed max-h-[300px] overflow-y-auto">
                      {improved}
                    </pre>
                    <button
                      onClick={() => useImprovedVersion(improved)}
                      className="mt-4 w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 rounded-lg hover:from-purple-600 hover:to-pink-600 transition font-medium"
                    >
                      Use This Version
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips Panel */}
          <div className="feature-card border border-purple-500/30 rounded-lg p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-purple-400 mb-3">Viral Body Copy Patterns</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-300">
              <div>
                <strong className="text-white">Opening Hooks:</strong>
                <ul className="mt-1 space-y-1">
                  <li>• "I have never been so mortified..."</li>
                  <li>• "This literally happened [time]..."</li>
                  <li>• "I (26F) recently discovered..."</li>
                  <li>• "Throwaway because..."</li>
                </ul>
              </div>
              <div>
                <strong className="text-white">Structure Elements:</strong>
                <ul className="mt-1 space-y-1">
                  <li>• Transformation words (but, finally, realized)</li>
                  <li>• Dialogue for vivid storytelling</li>
                  <li>• Emotional reactions throughout</li>
                  <li>• TL;DR at the end (for longer posts)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'

interface ContentVariation {
  title: string
  content: string
  reasoning: string
}

interface ViralAnalysis {
  score: number
  tier: string
  suggestions: string[]
}

interface SubredditRule {
  shortName: string
  description: string
  priority: number
}

interface AIContentGeneratorProps {
  subreddit: string
  onSelectContent: (title: string, content: string) => void
  subredditRules?: SubredditRule[]
}

export default function AIContentGenerator({ subreddit, onSelectContent, subredditRules }: AIContentGeneratorProps) {
  const [topic, setTopic] = useState('')
  const [tone, setTone] = useState<'question' | 'casual' | 'humorous' | 'informative' | 'controversial' | 'educational' | 'storytelling'>('casual')
  const [contentLength, setContentLength] = useState<'short' | 'medium' | 'long'>('medium')
  const [variationCount, setVariationCount] = useState<3 | 4 | 5 | 6>(3)
  const [additionalContext, setAdditionalContext] = useState('')
  const [variations, setVariations] = useState<ContentVariation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [viralAnalyses, setViralAnalyses] = useState<Record<number, ViralAnalysis>>({})
  const [analyzingIndex, setAnalyzingIndex] = useState<number | null>(null)

  async function analyzeViral(index: number, content: string) {
    setAnalyzingIndex(index)
    try {
      const response = await fetch('/api/viral/analyze-body', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, subreddit }),
      })
      if (response.ok) {
        const data = await response.json()
        setViralAnalyses(prev => ({ ...prev, [index]: data }))
      }
    } catch (err) {
      console.error('Viral analysis failed:', err)
    } finally {
      setAnalyzingIndex(null)
    }
  }

  async function generateContent() {
    if (!topic.trim()) {
      setError('Please enter a topic')
      return
    }

    if (!subreddit.trim()) {
      setError('Please enter a subreddit first')
      return
    }

    setLoading(true)
    setError('')
    setVariations([])
    setViralAnalyses({})

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          subreddit,
          tone,
          postType: 'text',
          contentLength,
          variationCount,
          additionalContext,
          subredditRules,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate content')
      }

      const data = await response.json()
      setVariations(data.variations || [])
    } catch (err: any) {
      setError(err.message || 'Failed to generate content')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border-2 border-dashed border-[#00D9FF]/50 rounded-lg p-6 bg-gradient-to-br from-[#12121a] to-[#1a1a24]">
      <div className="flex items-center gap-3 mb-4">
        <img src="/reddride-logo.png" alt="ReddRide" className="h-8 object-contain" />
        <h3 className="text-lg font-semibold text-white">AI Content Generator</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            What do you want to post about?
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="e.g., New productivity app for developers"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-600 bg-[#0a0a0f] rounded-lg focus:ring-2 focus:ring-[#00D9FF] focus:border-transparent text-white placeholder-gray-500"
            />
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as typeof tone)}
              className="px-3 py-2 border border-gray-600 bg-[#0a0a0f] rounded-lg focus:ring-2 focus:ring-[#00D9FF] focus:border-transparent text-white cursor-pointer"
            >
              <option value="casual">Casual</option>
              <option value="question">Question</option>
              <option value="humorous">Humorous</option>
              <option value="informative">Informative</option>
              <option value="controversial">Controversial</option>
              <option value="educational">Educational</option>
              <option value="storytelling">Storytelling</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Length:</span>
            {(['short', 'medium', 'long'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setContentLength(l)}
                className={`text-sm transition ${
                  contentLength === l
                    ? 'text-[#00D9FF] font-medium'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {l.charAt(0).toUpperCase() + l.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Variations:</span>
            {([3, 4, 5, 6] as const).map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setVariationCount(num)}
                className={`text-sm transition ${
                  variationCount === num
                    ? 'text-[#00D9FF] font-medium'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Additional Context (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="Any specific points you want to include..."
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            className="w-full px-4 py-2 border border-gray-600 bg-[#0a0a0f] rounded-lg focus:ring-2 focus:ring-[#00D9FF] focus:border-transparent text-white placeholder-gray-500"
          />
        </div>

        <button
          type="button"
          onClick={generateContent}
          disabled={loading || !topic.trim()}
          className="w-full bg-gradient-to-r from-[#00D9FF] to-cyan-600 text-black px-6 py-3 rounded-lg hover:from-cyan-400 hover:to-cyan-500 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
              Generating with AI...
            </span>
          ) : (
            'Generate Content with AI'
          )}
        </button>

        {error && (
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {variations.length > 0 && (
          <div className="mt-6 space-y-4">
            <h4 className="font-semibold text-white">Generated Variations:</h4>
            {variations.map((variation, index) => (
              <div
                key={index}
                className="bg-[#0a0a0f] border border-gray-700 rounded-lg p-4 hover:border-[#00D9FF]/50 transition"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-medium text-[#00D9FF]">
                    Variation {index + 1}
                    {viralAnalyses[index] && (
                      <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold ${
                        viralAnalyses[index].score >= 80 ? 'bg-green-500/20 text-green-400' :
                        viralAnalyses[index].score >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {viralAnalyses[index].score}/100
                      </span>
                    )}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => analyzeViral(index, variation.content)}
                      disabled={analyzingIndex === index}
                      className="text-xs bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-500 transition disabled:opacity-50"
                    >
                      {analyzingIndex === index ? 'Analyzing...' : 'Viral Score'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectContent(variation.title, variation.content)}
                      className="text-xs bg-[#00D9FF] text-black px-3 py-1 rounded hover:bg-cyan-400 transition"
                    >
                      Use This
                    </button>
                  </div>
                </div>
                <h5 className="font-semibold text-white mb-2">{variation.title}</h5>
                <p className="text-sm text-gray-400 mb-2 whitespace-pre-wrap line-clamp-3">
                  {variation.content}
                </p>
                {variation.reasoning && (
                  <p className="text-xs text-gray-500 italic">
                    {variation.reasoning}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

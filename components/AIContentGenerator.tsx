'use client'

import { useState } from 'react'

interface ContentVariation {
  title: string
  content: string
  reasoning: string
}

interface AIContentGeneratorProps {
  subreddit: string
  onSelectContent: (title: string, content: string) => void
}

export default function AIContentGenerator({ subreddit, onSelectContent }: AIContentGeneratorProps) {
  const [topic, setTopic] = useState('')
  const [tone, setTone] = useState<'professional' | 'casual' | 'humorous' | 'informative'>('casual')
  const [additionalContext, setAdditionalContext] = useState('')
  const [variations, setVariations] = useState<ContentVariation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          subreddit,
          tone,
          postType: 'text',
          additionalContext,
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
          <input
            type="text"
            placeholder="e.g., New productivity app for developers"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full px-4 py-2 border border-gray-600 bg-[#0a0a0f] rounded-lg focus:ring-2 focus:ring-[#00D9FF] focus:border-transparent text-white placeholder-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Tone
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(['casual', 'professional', 'humorous', 'informative'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTone(t)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  tone === t
                    ? 'bg-[#00D9FF] text-black'
                    : 'bg-[#0a0a0f] text-gray-300 border border-gray-600 hover:bg-gray-800'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
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
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectContent(variation.title, variation.content)}
                    className="text-xs bg-[#00D9FF] text-black px-3 py-1 rounded hover:bg-cyan-400 transition"
                  >
                    Use This
                  </button>
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

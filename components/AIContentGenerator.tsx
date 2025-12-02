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
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🤖</span>
        <h3 className="text-lg font-semibold text-gray-900">AI Content Generator</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What do you want to post about?
          </label>
          <input
            type="text"
            placeholder="e.g., New productivity app for developers"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Context (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="Any specific points you want to include..."
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <button
          type="button"
          onClick={generateContent}
          disabled={loading || !topic.trim()}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Generating with AI...
            </span>
          ) : (
            '✨ Generate Content with AI'
          )}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {variations.length > 0 && (
          <div className="mt-6 space-y-4">
            <h4 className="font-semibold text-gray-900">Generated Variations:</h4>
            {variations.map((variation, index) => (
              <div
                key={index}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-medium text-purple-600">
                    Variation {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectContent(variation.title, variation.content)}
                    className="text-xs bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 transition"
                  >
                    Use This
                  </button>
                </div>
                <h5 className="font-semibold text-gray-900 mb-2">{variation.title}</h5>
                <p className="text-sm text-gray-600 mb-2 whitespace-pre-wrap line-clamp-3">
                  {variation.content}
                </p>
                {variation.reasoning && (
                  <p className="text-xs text-gray-500 italic">
                    💡 {variation.reasoning}
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

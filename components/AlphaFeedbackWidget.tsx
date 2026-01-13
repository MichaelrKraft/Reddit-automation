'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { usePathname } from 'next/navigation'

type FeedbackType = 'bug' | 'feature' | 'general'

const feedbackTypes: { value: FeedbackType; label: string; icon: string }[] = [
  { value: 'bug', label: 'Bug', icon: '🐛' },
  { value: 'feature', label: 'Feature', icon: '💡' },
  { value: 'general', label: 'General', icon: '💬' },
]

export default function AlphaFeedbackWidget() {
  const { userId } = useAuth()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [type, setType] = useState<FeedbackType>('general')
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [rating, setRating] = useState<number>(0)
  const [hoveredRating, setHoveredRating] = useState<number>(0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          message,
          rating: rating || null,
          name: name || null,
          email: email || null,
          page: pathname,
          userAgent: navigator.userAgent,
        }),
      })

      if (response.ok) {
        setSubmitted(true)
        setMessage('')
        setRating(0)
        setName('')
        setEmail('')
        setTimeout(() => {
          setSubmitted(false)
          setIsOpen(false)
        }, 2000)
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Feedback Panel */}
      {isOpen && (
        <div className="absolute bottom-12 right-0 w-72 bg-[#12121a] border border-gray-700 rounded-lg shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 px-3 py-2 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Alpha Feedback</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {submitted ? (
            <div className="p-4 text-center">
              <div className="text-2xl mb-2">✅</div>
              <p className="text-sm text-gray-300">Thanks for the feedback!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-3 space-y-3">
              {/* Type Selection */}
              <div className="flex gap-1">
                {feedbackTypes.map((ft) => (
                  <button
                    key={ft.value}
                    type="button"
                    onClick={() => setType(ft.value)}
                    className={`flex-1 px-2 py-1.5 text-xs rounded-md transition-all ${
                      type === ft.value
                        ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400'
                        : 'bg-gray-800 border border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <span className="mr-1">{ft.icon}</span>
                    {ft.label}
                  </button>
                ))}
              </div>

              {/* Star Rating */}
              <div className="space-y-1">
                <p className="text-[10px] text-gray-400">How do you like the app?</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="text-xl transition-transform hover:scale-110"
                    >
                      {star <= (hoveredRating || rating) ? '⭐' : '☆'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full px-2 py-1.5 text-sm bg-[#0a0a0f] border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 resize-none"
                rows={2}
                required
              />

              {/* Contact info for response */}
              <div className="space-y-2">
                <p className="text-[10px] text-gray-500">Want a response? Leave your info:</p>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name (optional)"
                  className="w-full px-2 py-1.5 text-sm bg-[#0a0a0f] border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email (optional)"
                  className="w-full px-2 py-1.5 text-sm bg-[#0a0a0f] border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting || !message.trim()}
                className="w-full px-3 py-1.5 text-xs font-medium bg-[#00D9FF] text-[#0a0a0f] rounded-md hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Sending...' : 'Send Feedback'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Toggle Button - Smaller than Gapfinder's */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 h-9 px-3 rounded-full shadow-lg transition-all ${
          isOpen
            ? 'bg-gray-800 text-gray-300'
            : 'bg-[#00D9FF] text-[#0a0a0f] hover:bg-cyan-400'
        }`}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        <div className="flex flex-col items-start leading-none">
          <span className="text-[9px] font-semibold opacity-80">Alpha</span>
          <span className="text-xs font-medium">Feedback</span>
        </div>
      </button>
    </div>
  )
}

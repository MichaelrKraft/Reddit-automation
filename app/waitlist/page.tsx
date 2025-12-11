'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function WaitlistPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [position, setPosition] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [waitlistCount, setWaitlistCount] = useState(0)

  useEffect(() => {
    fetchWaitlistStats()
  }, [])

  async function fetchWaitlistStats() {
    try {
      const response = await fetch('/api/waitlist/stats')
      const data = await response.json()
      setWaitlistCount(data.count || 0)
    } catch (error) {
      console.error('Failed to fetch waitlist stats:', error)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join waitlist')
      }

      setPosition(data.position)
      setIsSubmitted(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 py-6 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img src="/reddride-logo-dark.png" alt="ReddRide" className="h-16" />
          </Link>
          <Link
            href="/sign-in"
            className="text-slate-400 hover:text-white transition"
          >
            Already have access? Sign In
          </Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {/* FOMO Badge */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-2 rounded-full text-sm font-semibold animate-pulse">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
            Founder Spots SOLD OUT
          </div>
        </div>

        {/* Main Heading */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            You Just Missed the
            <span className="block bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
              $29 Lifetime Deal
            </span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            All 20 founder spots have been claimed. But don't worry - join the waitlist and be the first to know when we open more spots or launch special offers.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-red-500 mb-2">SOLD OUT</div>
            <div className="text-slate-400">Founder Spots</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-white mb-2">{waitlistCount}+</div>
            <div className="text-slate-400">On the Waitlist</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-emerald-500 mb-2">$29/mo</div>
            <div className="text-slate-400">Regular Price</div>
          </div>
        </div>

        {/* Waitlist Form */}
        {!isSubmitted ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 md:p-12 max-w-xl mx-auto">
            <h2 className="text-2xl font-bold text-white text-center mb-2">
              Get Early Access
            </h2>
            <p className="text-slate-400 text-center mb-8">
              Be first in line when we release more spots
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
                  Name (optional)
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                />
              </div>

              {error && (
                <div className="text-red-400 text-sm text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Joining...
                  </span>
                ) : (
                  'Join the Waitlist'
                )}
              </button>
            </form>

            <p className="text-xs text-slate-500 text-center mt-4">
              No spam, ever. We'll only email you about availability and exclusive offers.
            </p>
          </div>
        ) : (
          /* Success State */
          <div className="bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/50 rounded-2xl p-8 md:p-12 max-w-xl mx-auto text-center">
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              You're on the list!
            </h2>
            <p className="text-slate-300 mb-6">
              You're #{position} on the waitlist. We'll notify you as soon as spots open up.
            </p>
            <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
              <div className="text-sm text-slate-400 mb-1">Your Position</div>
              <div className="text-4xl font-bold text-cyan-400">#{position}</div>
            </div>
            <p className="text-sm text-slate-400">
              Want to move up? Share ReddRide with friends and we'll bump your position!
            </p>
          </div>
        )}

        {/* What You'll Get Section */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-white text-center mb-8">
            What You'll Get Access To
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { title: 'AI Content Generation', desc: 'Generate viral Reddit posts with AI assistance' },
              { title: 'Speed Alerts', desc: 'Be first to respond to new posts in your niche' },
              { title: 'Spy Mode', desc: 'Track competitor activity and steal their strategies' },
              { title: 'Optimal Timing', desc: 'Post when your audience is most active' },
              { title: 'Viral Optimizer', desc: 'Analyze and improve your post headlines' },
              { title: 'Account Warmup', desc: 'Build credibility without getting banned' },
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-4 bg-slate-800/30 rounded-lg p-4">
                <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <div className="font-semibold text-white">{feature.title}</div>
                  <div className="text-sm text-slate-400">{feature.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-6 text-center text-slate-500 text-sm">
        <p>&copy; {new Date().getFullYear()} ReddRide. All rights reserved.</p>
      </footer>
    </main>
  )
}

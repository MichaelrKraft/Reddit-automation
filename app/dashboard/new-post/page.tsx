'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AIContentGenerator from '@/components/AIContentGenerator'
import SubredditAnalysis from '@/components/SubredditAnalysis'
import OptimalTimingWidget from '@/components/OptimalTimingWidget'

export default function NewPost() {
  const router = useRouter()
  const [accountId, setAccountId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    subredditName: '',
    postType: 'text',
    scheduleNow: true,
    scheduledDate: '',
    scheduledTime: '',
  })

  useEffect(() => {
    fetchAccount()
    
    const params = new URLSearchParams(window.location.search)
    const subreddit = params.get('subreddit')
    if (subreddit) {
      setFormData(prev => ({ ...prev, subredditName: subreddit }))
    }
  }, [])

  async function fetchAccount() {
    try {
      const response = await fetch('/api/account')
      const data = await response.json()
      if (data.account) {
        setAccountId(data.account.id)
      }
    } catch (error) {
      console.error('Failed to fetch account:', error)
    }
  }

  async function handleSaveDraft() {
    if (!accountId) {
      alert('No Reddit account found. Please check your .env.local configuration.')
      return
    }

    setLoading(true)

    try {
      const postResponse = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          subredditName: formData.subredditName,
          accountId,
          postType: formData.postType,
        }),
      })

      if (!postResponse.ok) {
        throw new Error('Failed to save draft')
      }

      alert('Draft saved successfully! You can schedule it later from the dashboard.')
      router.push('/dashboard')
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!accountId) {
      alert('No Reddit account found. Please check your .env.local configuration.')
      return
    }

    setLoading(true)

    try {
      const postResponse = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          subredditName: formData.subredditName,
          accountId,
          postType: formData.postType,
        }),
      })

      if (!postResponse.ok) {
        throw new Error('Failed to create post')
      }

      const { post } = await postResponse.json()

      if (formData.scheduleNow) {
        const scheduleResponse = await fetch('/api/posts/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            postId: post.id,
            scheduledAt: new Date().toISOString(),
          }),
        })

        if (!scheduleResponse.ok) {
          throw new Error('Failed to schedule post')
        }
      } else if (formData.scheduledDate && formData.scheduledTime) {
        const scheduledAt = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`)
        
        const scheduleResponse = await fetch('/api/posts/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            postId: post.id,
            scheduledAt: scheduledAt.toISOString(),
          }),
        })

        if (!scheduleResponse.ok) {
          throw new Error('Failed to schedule post')
        }
      }

      alert('Post created and scheduled successfully!')
      router.push('/dashboard')
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
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
        {/* Logo */}
        <div className="mb-4 sm:mb-6">
          <Link href="/">
            <img
              src="/reddride-logo-dark.png"
              alt="ReddRide - The Reddit AI Automation Platform"
              className="h-16 sm:h-[101px] object-contain cursor-pointer"
            />
          </Link>
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-wrap gap-2 sm:gap-3 mb-6 sm:mb-8">
          <Link
            href="/dashboard"
            className="bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg hover:bg-[#00D9FF]/30 transition font-semibold text-sm sm:text-base"
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/spy-mode"
            className="bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg hover:bg-[#00D9FF]/30 transition font-semibold text-sm sm:text-base"
          >
            Spy Mode
          </Link>
          <Link
            href="/dashboard/speed-alerts"
            className="bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg hover:bg-[#00D9FF]/30 transition font-semibold text-sm sm:text-base"
          >
            Speed Alerts
          </Link>
          <Link
            href="/dashboard/viral"
            className="bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg hover:bg-[#00D9FF]/30 transition font-semibold text-sm sm:text-base"
          >
            Viral Optimizer
          </Link>
          <Link
            href="/dashboard/timing"
            className="bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg hover:bg-[#00D9FF]/30 transition font-semibold text-sm sm:text-base"
          >
            Optimal Times
          </Link>
          <Link
            href="/dashboard/analytics"
            className="bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg hover:bg-[#00D9FF]/30 transition font-semibold text-sm sm:text-base"
          >
            Analytics
          </Link>
          <Link
            href="/dashboard/comments"
            className="bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg hover:bg-[#00D9FF]/30 transition font-semibold text-sm sm:text-base"
          >
            Comments
          </Link>
          <Link
            href="/dashboard/calendar"
            className="bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg hover:bg-[#00D9FF]/30 transition font-semibold text-sm sm:text-base"
          >
            Calendar
          </Link>
          <Link
            href="/warmup"
            className="bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg hover:bg-[#00D9FF]/30 transition font-semibold text-sm sm:text-base"
          >
            Warmup
          </Link>
          <Link
            href="/dashboard/new-post"
            className="bg-[#00D9FF]/30 text-[#00D9FF] border border-[#00D9FF] px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg font-semibold text-sm sm:text-base"
          >
            + New Post
          </Link>
        </div>

        {/* Page Header */}
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Create New Post</h1>
            <p className="text-gray-400 mt-1 text-sm sm:text-base">Schedule a post to Reddit</p>
          </div>

        <div className="feature-card rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <AIContentGenerator
              subreddit={formData.subredditName}
              onSelectContent={(title, content) => {
                setFormData({ ...formData, title, content })
              }}
            />

            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Post Details</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Subreddit
              </label>
              <input
                type="text"
                required
                placeholder="e.g., technology"
                value={formData.subredditName}
                onChange={(e) => setFormData({ ...formData, subredditName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-600 bg-[#12121a] rounded-lg focus:ring-2 focus:ring-reddit-orange focus:border-transparent text-white placeholder-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter subreddit name without "r/"
              </p>
            </div>

            {formData.subredditName && (
              <SubredditAnalysis subreddit={formData.subredditName} />
            )}

            {formData.subredditName && (
              <OptimalTimingWidget 
                subreddit={formData.subredditName}
                onSelectTime={(time) => {
                  const date = time.toISOString().split('T')[0]
                  const timeStr = time.toTimeString().slice(0, 5)
                  setFormData({
                    ...formData,
                    scheduleNow: false,
                    scheduledDate: date,
                    scheduledTime: timeStr,
                  })
                }}
              />
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Post Type
              </label>
              <div className="flex gap-4">
                <label className="flex items-center text-gray-300">
                  <input
                    type="radio"
                    value="text"
                    checked={formData.postType === 'text'}
                    onChange={(e) => setFormData({ ...formData, postType: e.target.value })}
                    className="mr-2"
                  />
                  Text Post
                </label>
                <label className="flex items-center text-gray-300">
                  <input
                    type="radio"
                    value="link"
                    checked={formData.postType === 'link'}
                    onChange={(e) => setFormData({ ...formData, postType: e.target.value })}
                    className="mr-2"
                  />
                  Link Post
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Title
              </label>
              <input
                type="text"
                required
                placeholder="Enter post title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-600 bg-[#12121a] rounded-lg focus:ring-2 focus:ring-reddit-orange focus:border-transparent text-white placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {formData.postType === 'text' ? 'Content' : 'URL'}
              </label>
              <textarea
                required
                rows={6}
                placeholder={formData.postType === 'text' ? 'Enter post content' : 'https://example.com'}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-4 py-2 border border-gray-600 bg-[#12121a] rounded-lg focus:ring-2 focus:ring-reddit-orange focus:border-transparent text-white placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Scheduling
              </label>
              <div className="space-y-3">
                <label className="flex items-center text-gray-300">
                  <input
                    type="radio"
                    checked={formData.scheduleNow}
                    onChange={() => setFormData({ ...formData, scheduleNow: true })}
                    className="mr-2"
                  />
                  Post immediately
                </label>
                <label className="flex items-center text-gray-300">
                  <input
                    type="radio"
                    checked={!formData.scheduleNow}
                    onChange={() => setFormData({ ...formData, scheduleNow: false })}
                    className="mr-2"
                  />
                  Schedule for later
                </label>
              </div>

              {!formData.scheduleNow && (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={formData.scheduledDate}
                      onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-600 bg-[#12121a] rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Time</label>
                    <input
                      type="time"
                      required
                      value={formData.scheduledTime}
                      onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-600 bg-[#12121a] rounded-lg text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-reddit-orange text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Post'}
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={loading || !formData.title || !formData.content || !formData.subredditName}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                💾 Save Draft
              </button>
              <Link
                href="/dashboard"
                className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
        </div>
      </div>
    </div>
  )
}

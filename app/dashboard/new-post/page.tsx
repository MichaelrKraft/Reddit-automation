'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AIContentGenerator from '@/components/AIContentGenerator'
import SubredditAnalysis from '@/components/SubredditAnalysis'
import OptimalTimingWidget from '@/components/OptimalTimingWidget'
import ImageUpload from '@/components/ImageUpload'
import DashboardNav from '@/components/DashboardNav'

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
    firstComment: '',
  })
  const [savingDraft, setSavingDraft] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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
    console.log('Save draft clicked, accountId:', accountId)
    setMessage(null)

    if (!accountId) {
      setMessage({ type: 'error', text: 'No Reddit account found. Please check your .env.local configuration.' })
      return
    }

    if (!formData.title || !formData.content || !formData.subredditName) {
      setMessage({ type: 'error', text: 'Please fill in all required fields (title, content, and subreddit).' })
      return
    }

    setSavingDraft(true)

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
          isDraft: true,
          firstComment: formData.firstComment || null,
        }),
      })

      const data = await postResponse.json()

      if (!postResponse.ok) {
        throw new Error(data.error || 'Failed to save draft')
      }

      setMessage({ type: 'success', text: 'Draft saved successfully! Redirecting to dashboard...' })
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch (error: any) {
      console.error('Save draft error:', error)
      setMessage({ type: 'error', text: `Error: ${error.message}` })
    } finally {
      setSavingDraft(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    if (!accountId) {
      setMessage({ type: 'error', text: 'No Reddit account found. Please check your .env.local configuration.' })
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
          firstComment: formData.firstComment || null,
        }),
      })

      if (!postResponse.ok) {
        throw new Error('Failed to create post')
      }

      const { post } = await postResponse.json()

      let scheduledTime = ''
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
        scheduledTime = 'immediately'
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
        scheduledTime = scheduledAt.toLocaleString()
      }

      const successMsg = scheduledTime
        ? `Post scheduled for ${scheduledTime}! Redirecting to dashboard...`
        : 'Post created successfully! Redirecting to dashboard...'
      setMessage({ type: 'success', text: successMsg })
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch (error: any) {
      setMessage({ type: 'error', text: `Error: ${error.message}` })
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
        <DashboardNav />

        {/* Page Header */}
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 sm:mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Create New Post</h1>
              <p className="text-gray-400 mt-1 text-sm sm:text-base">Schedule a post to Reddit</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={savingDraft || loading || !formData.title || !formData.content || !formData.subredditName}
                className="bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-4 py-2 rounded-lg hover:bg-[#00D9FF]/30 transition disabled:opacity-50 font-semibold text-sm"
              >
                {savingDraft ? 'Saving...' : 'Save Draft'}
              </button>
              <Link
                href="/dashboard"
                className="glass-button text-gray-300 px-4 py-2 rounded-lg transition text-sm"
              >
                ← Back
              </Link>
            </div>
          </div>

        <div className="feature-card rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Subreddit input first - AI Content Generator needs it */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Target Subreddit
              </label>
              <input
                type="text"
                required
                placeholder="e.g., technology"
                value={formData.subredditName}
                onChange={(e) => setFormData(prev => ({ ...prev, subredditName: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-600 bg-[#12121a] rounded-lg focus:ring-2 focus:ring-reddit-orange focus:border-transparent text-white placeholder-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter subreddit name without "r/" - needed for AI content generation
              </p>
            </div>

            <AIContentGenerator
              subreddit={formData.subredditName}
              onSelectContent={(title, content) => {
                setFormData(prev => ({ ...prev, title, content }))
              }}
            />

            {formData.subredditName && (
              <SubredditAnalysis subreddit={formData.subredditName} />
            )}

            {formData.subredditName && (
              <OptimalTimingWidget
                subreddit={formData.subredditName}
                onSelectTime={(time) => {
                  const date = time.toISOString().split('T')[0]
                  const timeStr = time.toTimeString().slice(0, 5)
                  setFormData(prev => ({
                    ...prev,
                    scheduleNow: false,
                    scheduledDate: date,
                    scheduledTime: timeStr,
                  }))
                }}
              />
            )}

            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Post Details</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Post Type
              </label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center text-gray-300">
                  <input
                    type="radio"
                    value="text"
                    checked={formData.postType === 'text'}
                    onChange={(e) => setFormData(prev => ({ ...prev, postType: e.target.value }))}
                    className="mr-2"
                  />
                  Text Post
                </label>
                <label className="flex items-center text-gray-300">
                  <input
                    type="radio"
                    value="link"
                    checked={formData.postType === 'link'}
                    onChange={(e) => setFormData(prev => ({ ...prev, postType: e.target.value }))}
                    className="mr-2"
                  />
                  Link Post
                </label>
                <label className="flex items-center text-gray-300">
                  <input
                    type="radio"
                    value="image"
                    checked={formData.postType === 'image'}
                    onChange={(e) => setFormData(prev => ({ ...prev, postType: e.target.value }))}
                    className="mr-2"
                  />
                  Image Post
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
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-600 bg-[#12121a] rounded-lg focus:ring-2 focus:ring-reddit-orange focus:border-transparent text-white placeholder-gray-500"
              />
            </div>

            {/* Image Upload - only for image posts */}
            {formData.postType === 'image' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Upload Image
                </label>
                <ImageUpload
                  currentUrl={formData.content}
                  onUpload={(url) => setFormData(prev => ({ ...prev, content: url }))}
                />
              </div>
            )}

            {/* Content/URL field - for text and link posts */}
            {formData.postType !== 'image' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {formData.postType === 'text' ? 'Content' : 'URL'}
                </label>
                <textarea
                  required
                  rows={formData.postType === 'text' ? 6 : 2}
                  placeholder={
                    formData.postType === 'text'
                      ? 'Enter post content'
                      : 'Paste your YouTube URL'
                  }
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-600 bg-[#12121a] rounded-lg focus:ring-2 focus:ring-reddit-orange focus:border-transparent text-white placeholder-gray-500"
                />
              </div>
            )}

            {/* First Comment - shows for image and link posts */}
            {(formData.postType === 'image' || formData.postType === 'link') && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  First Comment (optional)
                </label>
                <textarea
                  rows={4}
                  placeholder="Add context, details, or your pitch here. This will be automatically posted as the first comment on your post."
                  value={formData.firstComment}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstComment: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-600 bg-[#12121a] rounded-lg focus:ring-2 focus:ring-reddit-orange focus:border-transparent text-white placeholder-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Pro tip: Many Redditors put their detailed explanation in the first comment rather than the title
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Scheduling
              </label>
              <div className="space-y-3">
                <label className="flex items-center text-gray-300">
                  <input
                    type="radio"
                    checked={formData.scheduleNow}
                    onChange={() => setFormData(prev => ({ ...prev, scheduleNow: true }))}
                    className="mr-2"
                  />
                  Post immediately
                </label>
                <label className="flex items-center text-gray-300">
                  <input
                    type="radio"
                    checked={!formData.scheduleNow}
                    onChange={() => setFormData(prev => ({ ...prev, scheduleNow: false }))}
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
                      onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-600 bg-[#12121a] rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Time</label>
                    <input
                      type="time"
                      required
                      value={formData.scheduledTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-600 bg-[#12121a] rounded-lg text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Inline Message Display */}
            {message && (
              <div className={`p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-900/50 text-green-300 border border-green-700'
                  : 'bg-red-900/50 text-red-300 border border-red-700'
              }`}>
                {message.text}
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading || savingDraft}
                className="flex-1 bg-[#00D9FF] text-black px-6 py-3 rounded-lg hover:bg-[#00D9FF]/80 transition disabled:opacity-50 font-semibold"
              >
                {loading ? 'Creating...' : 'Create Post'}
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={savingDraft || loading || !formData.title || !formData.content || !formData.subredditName}
                className="flex-1 bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-6 py-3 rounded-lg hover:bg-[#00D9FF]/30 transition disabled:opacity-50 font-semibold"
              >
                {savingDraft ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-[#00D9FF] border-t-transparent rounded-full animate-spin"></span>
                    Saving...
                  </span>
                ) : (
                  'Save Draft'
                )}
              </button>
              <Link
                href="/dashboard/drafts"
                className="flex-1 bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-6 py-3 rounded-lg hover:bg-[#00D9FF]/30 transition text-center font-semibold"
              >
                Drafts
              </Link>
            </div>

            {/* Cancel Button - Below action buttons */}
            <div className="pt-4 border-t border-gray-700 mt-4">
              <Link
                href="/dashboard"
                className="block w-full px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition text-center"
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

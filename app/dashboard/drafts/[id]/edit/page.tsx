'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import ImageUpload from '@/components/ImageUpload'

export default function EditDraft() {
  const router = useRouter()
  const params = useParams()
  const draftId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    subredditName: '',
    postType: 'text',
    scheduledDate: '',
    scheduledTime: '',
    firstComment: '',
  })

  useEffect(() => {
    fetchDraft()
  }, [draftId])

  async function fetchDraft() {
    try {
      setLoading(true)
      const response = await fetch(`/api/posts/${draftId}`)
      const data = await response.json()

      if (data.post) {
        setFormData({
          title: data.post.title || '',
          content: data.post.content || '',
          subredditName: data.post.subreddit?.name || '',
          postType: data.post.postType || 'text',
          scheduledDate: '',
          scheduledTime: '',
          firstComment: data.post.firstComment || '',
        })
      }
    } catch (error) {
      console.error('Failed to fetch draft:', error)
      alert('Failed to load draft')
      router.push('/dashboard/drafts')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const response = await fetch(`/api/posts/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          postType: formData.postType,
          firstComment: formData.firstComment || null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save draft')
      }

      alert('Draft saved successfully!')
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleSchedule() {
    if (!formData.scheduledDate || !formData.scheduledTime) {
      alert('Please select a date and time to schedule')
      return
    }

    setScheduling(true)
    try {
      // First save any changes
      await fetch(`/api/posts/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          postType: formData.postType,
          firstComment: formData.firstComment || null,
        }),
      })

      // Then schedule it
      const scheduledAt = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`)
      const scheduleResponse = await fetch('/api/posts/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: draftId,
          scheduledAt: scheduledAt.toISOString(),
        }),
      })

      if (!scheduleResponse.ok) {
        throw new Error('Failed to schedule post')
      }

      alert('Post scheduled successfully!')
      router.push('/dashboard')
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setScheduling(false)
    }
  }

  async function handlePostNow() {
    setScheduling(true)
    try {
      // First save any changes
      await fetch(`/api/posts/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          postType: formData.postType,
          firstComment: formData.firstComment || null,
        }),
      })

      // Then schedule for now
      const scheduleResponse = await fetch('/api/posts/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: draftId,
          scheduledAt: new Date().toISOString(),
        }),
      })

      if (!scheduleResponse.ok) {
        throw new Error('Failed to post')
      }

      alert('Post submitted successfully!')
      router.push('/dashboard')
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setScheduling(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D9FF] mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading draft...</p>
        </div>
      </div>
    )
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

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {/* Navigation */}
        <div className="flex flex-wrap gap-2 sm:gap-3 mb-6 sm:mb-8">
          <Link
            href="/dashboard"
            className="bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg hover:bg-[#00D9FF]/30 transition font-semibold text-sm sm:text-base"
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/drafts"
            className="bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg hover:bg-[#00D9FF]/30 transition font-semibold text-sm sm:text-base"
          >
            📝 Drafts
          </Link>
        </div>

        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Edit Draft</h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">
            Modify your draft and schedule it when ready
          </p>
        </div>

        {/* Form */}
        <div className="feature-card rounded-lg p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Subreddit
              </label>
              <div className="w-full px-4 py-2 border border-gray-600 bg-[#12121a] rounded-lg text-gray-400">
                r/{formData.subredditName}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Subreddit cannot be changed after draft creation
              </p>
            </div>

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
                <label className="flex items-center text-gray-300">
                  <input
                    type="radio"
                    value="image"
                    checked={formData.postType === 'image'}
                    onChange={(e) => setFormData({ ...formData, postType: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-600 bg-[#12121a] rounded-lg focus:ring-2 focus:ring-[#00D9FF] focus:border-transparent text-white placeholder-gray-500"
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
                  onUpload={(url) => setFormData({ ...formData, content: url })}
                />
              </div>
            )}

            {/* Content/URL field - hide for image posts */}
            {formData.postType !== 'image' && (
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
                  className="w-full px-4 py-2 border border-gray-600 bg-[#12121a] rounded-lg focus:ring-2 focus:ring-[#00D9FF] focus:border-transparent text-white placeholder-gray-500"
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
                  onChange={(e) => setFormData({ ...formData, firstComment: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-600 bg-[#12121a] rounded-lg focus:ring-2 focus:ring-[#00D9FF] focus:border-transparent text-white placeholder-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Pro tip: Many Redditors put their detailed explanation in the first comment rather than the title
                </p>
              </div>
            )}

            {/* Scheduling */}
            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Schedule Post</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-600 bg-[#12121a] rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Time</label>
                  <input
                    type="time"
                    value={formData.scheduledTime}
                    onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-600 bg-[#12121a] rounded-lg text-white"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-6 py-3 rounded-lg hover:bg-[#00D9FF]/30 transition disabled:opacity-50 font-semibold"
              >
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                type="button"
                onClick={handleSchedule}
                disabled={scheduling || !formData.scheduledDate || !formData.scheduledTime}
                className="flex-1 bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-6 py-3 rounded-lg hover:bg-[#00D9FF]/30 transition disabled:opacity-50 font-semibold"
              >
                {scheduling ? 'Scheduling...' : 'Schedule Post'}
              </button>
              <button
                type="button"
                onClick={handlePostNow}
                disabled={scheduling}
                className="flex-1 bg-[#00D9FF] text-black px-6 py-3 rounded-lg hover:bg-[#00D9FF]/80 transition disabled:opacity-50 font-semibold"
              >
                {scheduling ? 'Posting...' : 'Post Now'}
              </button>
            </div>

            <div className="text-center">
              <Link
                href="/dashboard/drafts"
                className="text-gray-400 hover:text-white transition text-sm"
              >
                ← Back to Drafts
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

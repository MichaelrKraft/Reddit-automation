'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import DashboardNav from '@/components/DashboardNav'

interface Post {
  id: string
  title: string
  content: string
  postType: string
  status: string
  scheduledAt: string | null
  postedAt: string | null
  url: string | null
  redditId: string | null
  firstComment: string | null
  createdAt: string
  subreddit: {
    name: string
    displayName: string
  }
  account: {
    username: string
  }
  analytics: {
    upvotes: number
    score: number
    commentCount: number
  } | null
}

export default function PostDetailPage() {
  const router = useRouter()
  const params = useParams()
  const postId = params.id as string

  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showReschedule, setShowReschedule] = useState(false)
  const [rescheduling, setRescheduling] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')

  useEffect(() => {
    fetchPost()
  }, [postId])

  async function fetchPost() {
    try {
      const response = await fetch(`/api/posts/${postId}`)
      if (!response.ok) {
        throw new Error('Post not found')
      }
      const data = await response.json()
      setPost(data.post)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleReschedule() {
    if (!newDate || !newTime) {
      setMessage({ type: 'error', text: 'Please select both date and time' })
      return
    }

    const scheduledAt = new Date(`${newDate}T${newTime}`)
    if (scheduledAt <= new Date()) {
      setMessage({ type: 'error', text: 'Scheduled time must be in the future' })
      return
    }

    setRescheduling(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/posts/${postId}/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: scheduledAt.toISOString() }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to reschedule')
      }

      setMessage({ type: 'success', text: `Rescheduled to ${scheduledAt.toLocaleString()}` })
      setShowReschedule(false)
      fetchPost() // Refresh post data
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setRescheduling(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this post?')) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete post')
      }

      setMessage({ type: 'success', text: 'Post deleted! Redirecting...' })
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
      setDeleting(false)
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'posted':
        return 'bg-green-900/50 text-green-300 border border-green-700'
      case 'failed':
        return 'bg-red-900/50 text-red-300 border border-red-700'
      case 'draft':
        return 'bg-gray-900/50 text-gray-300 border border-gray-700'
      default:
        return 'bg-blue-900/50 text-blue-300 border border-blue-700'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#00D9FF]"></div>
          <p className="text-gray-400 mt-2">Loading post...</p>
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">{error || 'Post not found'}</p>
          <Link
            href="/dashboard"
            className="text-[#00D9FF] hover:underline"
          >
            ← Back to Dashboard
          </Link>
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

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardNav />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
          <div>
            <Link
              href="/dashboard/calendar"
              className="text-[#00D9FF] hover:underline text-sm mb-2 inline-block"
            >
              ← Back to Calendar
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">{post.title}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(post.status)}`}>
                {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
              </span>
              <span className="text-gray-400 text-sm">r/{post.subreddit.name}</span>
              <span className="text-gray-500 text-sm">@{post.account.username}</span>
            </div>
          </div>

          <div className="flex gap-2">
            {post.status === 'draft' && (
              <Link
                href={`/dashboard/new-post?edit=${post.id}`}
                className="bg-[#00D9FF] text-black px-4 py-2 rounded-lg hover:bg-[#00D9FF]/80 transition font-medium text-sm"
              >
                Edit Post
              </Link>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600/20 text-red-400 border border-red-600/50 px-4 py-2 rounded-lg hover:bg-red-600/30 transition font-medium text-sm disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg mb-6 ${
            message.type === 'success'
              ? 'bg-green-900/50 text-green-300 border border-green-700'
              : 'bg-red-900/50 text-red-300 border border-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Post Details Card */}
        <div className="feature-card rounded-lg p-6 space-y-6">
          {/* Timing Info */}
          <div className="p-4 bg-[#0a0a0f] rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Scheduled For</p>
                <p className="text-white font-medium">
                  {post.scheduledAt
                    ? new Date(post.scheduledAt).toLocaleString()
                    : 'Not scheduled'}
                </p>
              </div>
              {post.postedAt && (
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Posted At</p>
                  <p className="text-white font-medium">
                    {new Date(post.postedAt).toLocaleString()}
                  </p>
                </div>
              )}
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Post Type</p>
                <p className="text-white font-medium capitalize">{post.postType}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Created</p>
                <p className="text-white font-medium">
                  {new Date(post.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Reschedule Section - only show for scheduled (not posted) posts */}
            {post.status === 'scheduled' && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                {!showReschedule ? (
                  <button
                    onClick={() => {
                      setShowReschedule(true)
                      // Pre-fill with current scheduled time
                      if (post.scheduledAt) {
                        const d = new Date(post.scheduledAt)
                        setNewDate(d.toISOString().split('T')[0])
                        setNewTime(d.toTimeString().slice(0, 5))
                      }
                    }}
                    className="bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/50 px-4 py-2 rounded-lg hover:bg-[#00D9FF]/30 transition font-medium text-sm"
                  >
                    🕐 Change Scheduled Time
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-white font-medium text-sm">Reschedule Post</p>
                    <div className="flex flex-wrap gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Date</label>
                        <input
                          type="date"
                          value={newDate}
                          onChange={(e) => setNewDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="px-3 py-2 border border-gray-600 bg-[#12121a] rounded-lg text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Time</label>
                        <input
                          type="time"
                          value={newTime}
                          onChange={(e) => setNewTime(e.target.value)}
                          className="px-3 py-2 border border-gray-600 bg-[#12121a] rounded-lg text-white text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleReschedule}
                        disabled={rescheduling}
                        className="bg-[#00D9FF] text-black px-4 py-2 rounded-lg hover:bg-[#00D9FF]/80 transition font-medium text-sm disabled:opacity-50"
                      >
                        {rescheduling ? 'Saving...' : 'Save New Time'}
                      </button>
                      <button
                        onClick={() => setShowReschedule(false)}
                        className="text-gray-400 hover:text-white px-4 py-2 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-2">
              {post.postType === 'text' ? 'Content' : post.postType === 'image' ? 'Image URL' : 'URL'}
            </p>
            {post.postType === 'image' && post.content ? (
              <div className="space-y-2">
                <p className="text-gray-400 text-sm break-all">{post.content}</p>
                <img
                  src={post.content}
                  alt="Post preview"
                  className="max-w-full max-h-64 rounded-lg border border-gray-700"
                  onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                />
              </div>
            ) : (
              <div className="bg-[#0a0a0f] rounded-lg p-4">
                <p className="text-gray-300 whitespace-pre-wrap">{post.content || 'No content'}</p>
              </div>
            )}
          </div>

          {/* First Comment */}
          {post.firstComment && (
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-2">First Comment</p>
              <div className="bg-[#0a0a0f] rounded-lg p-4 border-l-2 border-[#00D9FF]">
                <p className="text-gray-300 whitespace-pre-wrap">{post.firstComment}</p>
              </div>
            </div>
          )}

          {/* Analytics (if posted) */}
          {post.analytics && post.status === 'posted' && (
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-2">Analytics</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#0a0a0f] rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-[#00D9FF]">{post.analytics.score}</p>
                  <p className="text-gray-500 text-xs">Score</p>
                </div>
                <div className="bg-[#0a0a0f] rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-400">{post.analytics.upvotes}</p>
                  <p className="text-gray-500 text-xs">Upvotes</p>
                </div>
                <div className="bg-[#0a0a0f] rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-orange-400">{post.analytics.commentCount}</p>
                  <p className="text-gray-500 text-xs">Comments</p>
                </div>
              </div>
            </div>
          )}

          {/* Reddit Link (if posted) */}
          {post.url && (
            <div className="pt-4 border-t border-gray-700">
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-reddit-orange hover:underline"
              >
                View on Reddit →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

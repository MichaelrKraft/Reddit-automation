'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Draft {
  id: string
  title: string
  content: string
  postType: string
  createdAt: string
  updatedAt: string
  subreddit: {
    name: string
    displayName: string
  }
}

export default function DraftsPage() {
  const router = useRouter()
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    fetchDrafts()
  }, [])

  async function fetchDrafts() {
    try {
      setLoading(true)
      const response = await fetch('/api/posts/drafts')
      const data = await response.json()
      setDrafts(data.drafts || [])
    } catch (error) {
      console.error('Failed to fetch drafts:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(draftId: string) {
    if (!confirm('Are you sure you want to delete this draft?')) return

    setDeleting(draftId)
    try {
      const response = await fetch(`/api/posts/${draftId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setDrafts(drafts.filter(d => d.id !== draftId))
      } else {
        alert('Failed to delete draft')
      }
    } catch (error) {
      console.error('Failed to delete draft:', error)
      alert('Failed to delete draft')
    } finally {
      setDeleting(null)
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  async function handleCopy(draft: Draft) {
    const textToCopy = `${draft.title}\n\n${draft.content}`
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(draft.id)
      setTimeout(() => setCopied(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
      alert('Failed to copy to clipboard')
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
            href="/dashboard/new-post"
            className="bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg hover:bg-[#00D9FF]/30 transition font-semibold text-sm sm:text-base"
          >
            + New Post
          </Link>
          <Link
            href="/dashboard/drafts"
            className="bg-[#00D9FF]/30 text-[#00D9FF] border border-[#00D9FF] px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg font-semibold text-sm sm:text-base"
          >
            📝 Drafts
          </Link>
        </div>

        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Your Drafts</h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">
            Review and manage your saved post drafts
          </p>
        </div>

        {/* Content */}
        <div className="feature-card rounded-lg p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D9FF] mx-auto"></div>
              <p className="text-gray-400 mt-4">Loading drafts...</p>
            </div>
          ) : drafts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-semibold text-white mb-2">No drafts yet</h3>
              <p className="text-gray-400 mb-6">
                Create a new post and save it as a draft to see it here.
              </p>
              <Link
                href="/dashboard/new-post"
                className="inline-block bg-[#00D9FF] text-black px-6 py-3 rounded-lg hover:bg-[#00D9FF]/80 transition font-semibold"
              >
                Create New Post
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="bg-[#12121a] border border-gray-700 rounded-lg p-4 hover:border-[#00D9FF]/50 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white truncate">
                        {draft.title || 'Untitled Draft'}
                      </h3>
                      <div className="flex items-center gap-3 mt-2 text-sm text-gray-400">
                        <span className="bg-[#00D9FF]/20 text-[#00D9FF] px-2 py-0.5 rounded">
                          r/{draft.subreddit.name}
                        </span>
                        <span>{draft.postType === 'text' ? '📝 Text' : '🔗 Link'}</span>
                        <span>Updated {formatDate(draft.updatedAt)}</span>
                      </div>
                      {draft.content && (
                        <p className="text-gray-500 mt-2 text-sm line-clamp-2">
                          {draft.content.substring(0, 150)}
                          {draft.content.length > 150 ? '...' : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 sm:flex-col">
                      <Link
                        href={`/dashboard/drafts/${draft.id}/edit`}
                        className="flex-1 sm:flex-none bg-[#00D9FF] text-black px-4 py-2 rounded-lg hover:bg-[#00D9FF]/80 transition font-semibold text-sm text-center"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleCopy(draft)}
                        className="flex-1 sm:flex-none bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-4 py-2 rounded-lg hover:bg-[#00D9FF]/30 transition font-semibold text-sm"
                      >
                        {copied === draft.id ? 'Copied!' : 'Copy'}
                      </button>
                      <button
                        onClick={() => handleDelete(draft.id)}
                        disabled={deleting === draft.id}
                        className="flex-1 sm:flex-none bg-red-600/20 text-red-400 border border-red-600/50 px-4 py-2 rounded-lg hover:bg-red-600/30 transition font-semibold text-sm disabled:opacity-50"
                      >
                        {deleting === draft.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Post {
  id: string
  title: string
  content: string
  status: string
  scheduledAt: string | null
  postedAt: string | null
  url: string | null
  subreddit: {
    name: string
    displayName: string
  }
  analytics?: {
    upvotes: number
    commentCount: number
    score: number
  }
}

export default function Dashboard() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    fetchPosts()
  }, [filter])

  async function fetchPosts() {
    try {
      setLoading(true)
      const url = filter === 'all' 
        ? '/api/posts' 
        : `/api/posts?status=${filter}`
      const response = await fetch(url)
      const data = await response.json()
      setPosts(data.posts || [])
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const statusColors = {
    scheduled: 'bg-blue-100 text-blue-800',
    posted: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage your Reddit posts</p>
          </div>
          <div className="flex gap-3">
            <Link 
              href="/dashboard/timing"
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition"
            >
              ⏰ Optimal Times
            </Link>
            <Link 
              href="/dashboard/analytics"
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              📊 Analytics
            </Link>
            <Link 
              href="/dashboard/comments"
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
            >
              💬 Comments
            </Link>
            <Link 
              href="/dashboard/discover"
              className="bg-reddit-blue text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              🔍 Discover Subreddits
            </Link>
            <Link 
              href="/dashboard/new-post"
              className="bg-reddit-orange text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition"
            >
              + New Post
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {['all', 'scheduled', 'posted', 'failed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 ${
                    filter === status
                      ? 'border-reddit-orange text-reddit-orange'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-reddit-orange"></div>
                <p className="text-gray-500 mt-2">Loading posts...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No posts found</p>
                <Link 
                  href="/dashboard/new-post"
                  className="text-reddit-orange hover:underline"
                >
                  Create your first post
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-reddit-blue">
                            {post.subreddit.displayName}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${statusColors[post.status as keyof typeof statusColors]}`}>
                            {post.status}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {post.title}
                        </h3>
                        <p className="text-gray-600 text-sm line-clamp-2 mb-2">
                          {post.content}
                        </p>
                        <div className="flex gap-4 text-xs text-gray-500">
                          {post.scheduledAt && (
                            <span>
                              Scheduled: {new Date(post.scheduledAt).toLocaleString()}
                            </span>
                          )}
                          {post.postedAt && (
                            <span>
                              Posted: {new Date(post.postedAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {post.analytics && (
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                              ↑ {post.analytics.upvotes}
                            </div>
                            <div className="text-xs text-gray-500">
                              💬 {post.analytics.commentCount}
                            </div>
                          </div>
                        )}
                        {post.url && (
                          <a
                            href={post.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-reddit-orange hover:underline"
                          >
                            View on Reddit →
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="text-center">
          <Link href="/" className="text-gray-600 hover:text-gray-900">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'

interface Comment {
  id: string
  redditId: string
  author: string
  content: string
  score: number
  replied: boolean
  replyText?: string
  repliedAt?: string
  createdAt: string
  depth: number
  post: {
    title: string
    subreddit: {
      name: string
      displayName: string
    }
  }
}

interface CommentsPanelProps {
  postId?: string
}

export default function CommentsPanel({ postId }: CommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null)
  const [generatingReply, setGeneratingReply] = useState(false)
  const [customReply, setCustomReply] = useState('')
  const [aiReply, setAiReply] = useState('')

  useEffect(() => {
    fetchComments()
  }, [postId])

  async function fetchComments() {
    try {
      setLoading(true)
      const url = postId 
        ? `/api/comments?postId=${postId}` 
        : '/api/comments'
      const response = await fetch(url)
      const data = await response.json()
      setComments(data.comments || [])
    } catch (error) {
      console.error('Failed to fetch comments:', error)
    } finally {
      setLoading(false)
    }
  }

  async function refreshComments() {
    if (!postId) {
      alert('Please select a specific post to refresh comments')
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      })

      const data = await response.json()
      alert(`Found ${data.newComments} new comments!`)
      await fetchComments()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function generateAIReply(comment: Comment) {
    setGeneratingReply(true)
    setSelectedComment(comment)
    setCustomReply('')
    setAiReply('')

    try {
      const response = await fetch('/api/comments/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId: comment.id,
          useAI: true,
        }),
      })

      const data = await response.json()
      
      if (response.ok) {
        alert('Reply posted successfully!')
        await fetchComments()
        setSelectedComment(null)
      } else {
        throw new Error(data.error || 'Failed to generate reply')
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setGeneratingReply(false)
    }
  }

  async function sendCustomReply(comment: Comment, replyText: string) {
    if (!replyText.trim()) {
      alert('Please enter a reply')
      return
    }

    setGeneratingReply(true)

    try {
      const response = await fetch('/api/comments/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId: comment.id,
          customReply: replyText,
          useAI: false,
        }),
      })

      const data = await response.json()
      
      if (response.ok) {
        alert('Reply posted successfully!')
        await fetchComments()
        setSelectedComment(null)
        setCustomReply('')
      } else {
        throw new Error(data.error || 'Failed to send reply')
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setGeneratingReply(false)
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Comments {postId ? '(Current Post)' : '(All Posts)'}
        </h2>
        {postId && (
          <button
            onClick={refreshComments}
            disabled={loading}
            className="bg-reddit-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh Comments'}
          </button>
        )}
      </div>

      {loading && comments.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-reddit-orange"></div>
          <p className="text-gray-500 mt-2">Loading comments...</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <span className="text-4xl mb-3 block">💬</span>
          <p className="text-gray-500 mb-2">No comments yet</p>
          {postId && (
            <button
              onClick={refreshComments}
              className="text-reddit-orange hover:underline"
            >
              Fetch comments from Reddit
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={`bg-white rounded-lg border p-4 ${
                comment.replied ? 'border-green-200 bg-green-50' : 'border-gray-200'
              }`}
              style={{ marginLeft: `${comment.depth * 20}px` }}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">u/{comment.author}</span>
                    <span className="text-sm text-gray-500">•</span>
                    <span className="text-sm text-gray-500">{formatDate(comment.createdAt)}</span>
                    <span className="text-sm text-gray-500">•</span>
                    <span className="text-sm font-medium text-reddit-orange">↑ {comment.score}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    on {comment.post.subreddit.displayName} - "{comment.post.title}"
                  </p>
                </div>
                {comment.replied ? (
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                    ✓ Replied
                  </span>
                ) : (
                  <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                    Pending
                  </span>
                )}
              </div>

              <p className="text-gray-800 mb-3 whitespace-pre-wrap">{comment.content}</p>

              {comment.replied && comment.replyText && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-blue-700">Your Reply:</span>
                    <span className="text-xs text-gray-500">
                      {comment.repliedAt && formatDate(comment.repliedAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{comment.replyText}</p>
                </div>
              )}

              {!comment.replied && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => generateAIReply(comment)}
                    disabled={generatingReply}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-blue-600 transition disabled:opacity-50 text-sm font-medium"
                  >
                    {generatingReply && selectedComment?.id === comment.id
                      ? 'Generating & Posting...'
                      : '✨ AI Reply Now'}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedComment(comment)
                      setCustomReply('')
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
                  >
                    Write Reply
                  </button>
                </div>
              )}

              {selectedComment?.id === comment.id && !comment.replied && (
                <div className="mt-3 p-3 bg-gray-50 border border-gray-300 rounded-lg">
                  <textarea
                    value={customReply}
                    onChange={(e) => setCustomReply(e.target.value)}
                    placeholder="Write your reply..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-reddit-orange focus:border-transparent mb-2"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => sendCustomReply(comment, customReply)}
                      disabled={generatingReply || !customReply.trim()}
                      className="flex-1 bg-reddit-orange text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition disabled:opacity-50 text-sm"
                    >
                      Send Reply
                    </button>
                    <button
                      onClick={() => setSelectedComment(null)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

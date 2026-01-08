'use client'

import { useState, useEffect } from 'react'

interface QueuedReply {
  id: string
  aiReplyText: string
  status: string
}

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
  queuedReplies?: QueuedReply[]
  post: {
    id: string
    title: string
    subreddit: {
      name: string
      displayName: string
    }
  }
}

interface DM {
  id: string
  author: string
  subject: string
  body: string
  created: string
  isNew: boolean
  redditUrl: string
}

interface CommentsPanelProps {
  postId?: string
}

export default function CommentsPanel({ postId }: CommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [approving, setApproving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [generatingReply, setGeneratingReply] = useState(false)
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null)
  const [customReply, setCustomReply] = useState('')
  const [statusFilter, setStatusFilter] = useState<'pending' | 'replied' | 'all'>('pending')
  const [dms, setDms] = useState<DM[]>([])
  const [loadingDms, setLoadingDms] = useState(false)
  const [showDms, setShowDms] = useState(true)

  useEffect(() => {
    // Auto-scan on mount
    autoScanAndFetch()
    fetchDms()
  }, [postId])

  async function fetchDms() {
    try {
      setLoadingDms(true)
      const response = await fetch('/api/dms')
      const data = await response.json()
      setDms(data.dms || [])
    } catch (error) {
      console.error('Failed to fetch DMs:', error)
    } finally {
      setLoadingDms(false)
    }
  }

  async function dismissDm(messageId: string) {
    try {
      await fetch('/api/dms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markRead', messageId }),
      })
      setDms(dms.filter(dm => dm.id !== messageId))
    } catch (error) {
      console.error('Failed to dismiss DM:', error)
    }
  }

  async function autoScanAndFetch() {
    setScanning(true)
    try {
      // First, trigger a scan to find new comments and generate AI replies
      await fetch('/api/reply-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scan', postId }),
      })
    } catch (error) {
      console.error('Auto-scan failed:', error)
    }
    setScanning(false)
    // Then fetch all comments
    await fetchComments()
  }

  async function fetchComments() {
    try {
      setLoading(true)
      const url = postId
        ? `/api/comments?postId=${postId}&includeQueue=true`
        : '/api/comments?includeQueue=true'
      const response = await fetch(url)
      const data = await response.json()
      setComments(data.comments || [])
    } catch (error) {
      console.error('Failed to fetch comments:', error)
    } finally {
      setLoading(false)
    }
  }

  async function approveSelected() {
    if (selectedIds.size === 0) return

    setApproving(true)
    try {
      const response = await fetch('/api/reply-queue/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyIds: Array.from(selectedIds) }),
      })
      const data = await response.json()
      alert(data.message)
      setSelectedIds(new Set())
      await fetchComments()
    } catch (error: any) {
      alert(`Failed: ${error.message}`)
    } finally {
      setApproving(false)
    }
  }

  async function approveOne(queuedReplyId: string) {
    try {
      const response = await fetch('/api/reply-queue/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyIds: [queuedReplyId] }),
      })
      const data = await response.json()
      if (data.successful > 0) {
        await fetchComments()
      } else {
        alert('Failed to post reply')
      }
    } catch (error: any) {
      alert(`Failed: ${error.message}`)
    }
  }

  async function dismissReply(replyId: string) {
    try {
      await fetch('/api/reply-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss', replyId }),
      })
      await fetchComments()
    } catch (error: any) {
      alert(`Failed: ${error.message}`)
    }
  }

  async function regenerateReply(replyId: string) {
    try {
      const response = await fetch('/api/reply-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate', replyId }),
      })
      const data = await response.json()
      if (data.reply) {
        await fetchComments()
      }
    } catch (error: any) {
      alert(`Failed: ${error.message}`)
    }
  }

  async function saveEdit(replyId: string) {
    try {
      await fetch('/api/reply-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit', replyId, newText: editText }),
      })
      setEditingId(null)
      setEditText('')
      await fetchComments()
    } catch (error: any) {
      alert(`Failed: ${error.message}`)
    }
  }

  async function sendImmediateReply(comment: Comment) {
    setGeneratingReply(true)
    setSelectedComment(comment)
    try {
      const response = await fetch('/api/comments/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId: comment.id, useAI: true }),
      })
      if (response.ok) {
        await fetchComments()
        setSelectedComment(null)
      } else {
        const data = await response.json()
        throw new Error(data.error)
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setGeneratingReply(false)
    }
  }

  async function sendCustomReply(comment: Comment, replyText: string) {
    if (!replyText.trim()) return
    setGeneratingReply(true)
    try {
      const response = await fetch('/api/comments/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId: comment.id, customReply: replyText, useAI: false }),
      })
      if (response.ok) {
        await fetchComments()
        setSelectedComment(null)
        setCustomReply('')
      } else {
        const data = await response.json()
        throw new Error(data.error)
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setGeneratingReply(false)
    }
  }

  function toggleSelection(replyId: string) {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(replyId)) {
      newSelected.delete(replyId)
    } else {
      newSelected.add(replyId)
    }
    setSelectedIds(newSelected)
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString()
  }

  // Filter comments based on status
  const pendingComments = comments.filter(c => !c.replied && c.queuedReplies?.some(q => q.status === 'PENDING'))
  const repliedComments = comments.filter(c => c.replied)
  const unrepliedNoQueue = comments.filter(c => !c.replied && !c.queuedReplies?.some(q => q.status === 'PENDING'))

  const filteredComments = statusFilter === 'pending'
    ? [...pendingComments, ...unrepliedNoQueue]
    : statusFilter === 'replied'
    ? repliedComments
    : comments

  const pendingQueueIds = pendingComments.flatMap(c =>
    c.queuedReplies?.filter(q => q.status === 'PENDING').map(q => q.id) || []
  )

  function selectAll() {
    if (selectedIds.size === pendingQueueIds.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pendingQueueIds))
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            Comments
            {scanning && <span className="text-sm text-[#00D9FF] animate-pulse">🔄 Scanning...</span>}
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            {pendingComments.length} pending replies • {repliedComments.length} replied
          </p>
        </div>
        <button
          onClick={() => { autoScanAndFetch(); fetchDms(); }}
          disabled={scanning}
          className="glass-button text-gray-300 px-4 py-2 rounded-lg transition disabled:opacity-50"
        >
          {scanning ? '🔄 Scanning...' : '🔍 Refresh & Scan'}
        </button>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setStatusFilter('pending')}
          className={`px-4 py-2 rounded-lg transition ${
            statusFilter === 'pending' ? 'bg-[#00D9FF] text-black font-medium' : 'glass-button text-gray-400 hover:text-white'
          }`}
        >
          Pending ({pendingComments.length + unrepliedNoQueue.length})
        </button>
        <button
          onClick={() => setStatusFilter('replied')}
          className={`px-4 py-2 rounded-lg transition ${
            statusFilter === 'replied' ? 'bg-[#00D9FF] text-black font-medium' : 'glass-button text-gray-400 hover:text-white'
          }`}
        >
          Replied ({repliedComments.length})
        </button>
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2 rounded-lg transition ${
            statusFilter === 'all' ? 'bg-[#00D9FF] text-black font-medium' : 'glass-button text-gray-400 hover:text-white'
          }`}
        >
          All ({comments.length})
        </button>
      </div>

      {/* Batch Actions */}
      {statusFilter === 'pending' && pendingQueueIds.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-[#00D9FF]/10 border border-[#00D9FF]/30 rounded-lg">
          <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedIds.size === pendingQueueIds.length && pendingQueueIds.length > 0}
              onChange={selectAll}
              className="w-5 h-5 rounded border-gray-600 bg-gray-800 accent-[#00D9FF]"
            />
            <span>Select All ({selectedIds.size} selected)</span>
          </label>
          <button
            onClick={approveSelected}
            disabled={selectedIds.size === 0 || approving}
            className="px-4 py-2 bg-[#00D9FF] hover:bg-[#00D9FF]/80 text-black font-medium rounded-lg transition disabled:opacity-50"
          >
            {approving ? '⏳ Posting...' : `✓ Approve & Post (${selectedIds.size})`}
          </button>
        </div>
      )}

      {/* Comments List */}
      {loading && comments.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#00D9FF]"></div>
          <p className="text-gray-400 mt-2">Loading comments...</p>
        </div>
      ) : filteredComments.length === 0 ? (
        <div className="text-center py-12 bg-[#12121a] rounded-lg border border-gray-700">
          <span className="text-4xl mb-3 block">💬</span>
          <p className="text-gray-400">
            {statusFilter === 'pending' ? 'No pending comments to reply to!' : 'No comments found'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredComments.map((comment) => {
            const pendingReply = comment.queuedReplies?.find(q => q.status === 'PENDING')

            return (
              <div
                key={comment.id}
                className={`bg-[#12121a] rounded-lg border p-4 ${
                  comment.replied ? 'border-green-700/50' : pendingReply ? 'border-[#00D9FF]/50' : 'border-gray-700'
                }`}
              >
                {/* Comment Header */}
                <div className="flex items-start gap-3">
                  {pendingReply && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(pendingReply.id)}
                      onChange={() => toggleSelection(pendingReply.id)}
                      className="w-5 h-5 mt-1 rounded border-gray-600 bg-gray-800 accent-[#00D9FF]"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white">u/{comment.author}</span>
                      <span className="text-gray-500">•</span>
                      <span className="text-sm text-gray-500">{formatDate(comment.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">
                      on <span className="text-blue-400">r/{comment.post.subreddit.name}</span> - "{comment.post.title}"
                    </p>
                  </div>
                  {comment.replied ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-900/50 text-green-400">✓ Replied</span>
                  ) : pendingReply ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-[#00D9FF]/20 text-[#00D9FF]">AI Ready</span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-700/50 text-gray-400">No Reply</span>
                  )}
                </div>

                {/* Original Comment */}
                <div className="bg-gray-900/50 rounded-lg p-3 mt-3 border-l-4 border-gray-600">
                  <p className="text-gray-300 whitespace-pre-wrap">{comment.content}</p>
                </div>

                {/* AI Generated Reply (Pending) */}
                {pendingReply && (
                  <div className="bg-[#00D9FF]/10 rounded-lg p-3 mt-3 border-l-4 border-[#00D9FF]">
                    <p className="text-[#00D9FF] text-xs mb-2">✨ AI-Generated Reply:</p>
                    {editingId === pendingReply.id ? (
                      <div>
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white resize-none"
                          rows={3}
                        />
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => saveEdit(pendingReply.id)} className="px-3 py-1 bg-[#00D9FF] hover:bg-[#00D9FF]/80 text-black font-medium rounded text-sm">Save</button>
                          <button onClick={() => { setEditingId(null); setEditText(''); }} className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-white">{pendingReply.aiReplyText}</p>
                    )}

                    {editingId !== pendingReply.id && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => approveOne(pendingReply.id)}
                          className="px-3 py-1 bg-[#00D9FF] hover:bg-[#00D9FF]/80 text-black font-medium rounded text-sm"
                        >
                          ✓ Approve & Post
                        </button>
                        <button
                          onClick={() => { setEditingId(pendingReply.id); setEditText(pendingReply.aiReplyText); }}
                          className="px-3 py-1 text-sm text-gray-400 hover:text-white transition"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => regenerateReply(pendingReply.id)}
                          className="px-3 py-1 text-sm text-gray-400 hover:text-white transition"
                        >
                          🔄 Regenerate
                        </button>
                        <button
                          onClick={() => dismissReply(pendingReply.id)}
                          className="px-3 py-1 text-sm text-gray-400 hover:text-gray-300 transition"
                        >
                          ✗ Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Already Replied */}
                {comment.replied && comment.replyText && (
                  <div className="bg-green-900/20 rounded-lg p-3 mt-3 border-l-4 border-green-500">
                    <p className="text-green-400 text-xs mb-2">Your Reply:</p>
                    <p className="text-gray-300">{comment.replyText}</p>
                  </div>
                )}

                {/* No queued reply - show quick actions */}
                {!comment.replied && !pendingReply && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => sendImmediateReply(comment)}
                      disabled={generatingReply}
                      className="flex-1 bg-gradient-to-r from-[#00D9FF] to-cyan-600 text-black px-4 py-2 rounded-lg hover:opacity-90 transition disabled:opacity-50 text-sm font-medium"
                    >
                      {generatingReply && selectedComment?.id === comment.id ? 'Generating...' : '✨ Generate & Post Now'}
                    </button>
                    <button
                      onClick={() => { setSelectedComment(comment); setCustomReply(''); }}
                      className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition text-sm"
                    >
                      Write Reply
                    </button>
                  </div>
                )}

                {/* Custom Reply Input */}
                {selectedComment?.id === comment.id && !comment.replied && !pendingReply && (
                  <div className="mt-3 p-3 bg-[#1a1a24] border border-gray-600 rounded-lg">
                    <textarea
                      value={customReply}
                      onChange={(e) => setCustomReply(e.target.value)}
                      placeholder="Write your reply..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-600 bg-[#12121a] rounded-lg text-white placeholder-gray-500"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => sendCustomReply(comment, customReply)}
                        disabled={generatingReply || !customReply.trim()}
                        className="flex-1 bg-[#00D9FF] text-black font-medium px-4 py-2 rounded-lg hover:bg-[#00D9FF]/80 transition disabled:opacity-50 text-sm"
                      >
                        Send Reply
                      </button>
                      <button
                        onClick={() => setSelectedComment(null)}
                        className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* DM Alerts Section - at bottom */}
      {dms.length > 0 && (
        <div className="bg-[#00D9FF]/10 border border-[#00D9FF]/30 rounded-lg p-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-[#00D9FF] flex items-center gap-2">
              ✉️ New DMs ({dms.length})
            </h3>
            <button
              onClick={() => setShowDms(!showDms)}
              className="text-sm text-gray-400 hover:text-white"
            >
              {showDms ? 'Hide' : 'Show'}
            </button>
          </div>
          {showDms && (
            <div className="space-y-3">
              {dms.map((dm) => (
                <div key={dm.id} className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white">u/{dm.author}</span>
                        <span className="text-gray-500">•</span>
                        <span className="text-sm text-gray-500">{new Date(dm.created).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-[#00D9FF] font-medium mb-1">[direct chat room]</p>
                      <p className="text-gray-300 text-sm line-clamp-2">{dm.body}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <a
                        href={dm.redditUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-[#00D9FF] hover:bg-[#00D9FF]/80 text-black font-medium rounded text-sm whitespace-nowrap"
                      >
                        Reply on Reddit →
                      </a>
                      <button
                        onClick={() => dismissDm(dm.id)}
                        className="px-3 py-1 text-gray-400 hover:text-white text-sm"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

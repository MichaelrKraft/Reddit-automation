'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Post {
  id: string
  title: string
  status: string
  scheduledAt: string
  subreddit: {
    name: string
    displayName: string
  }
}

interface PostCalendarProps {
  onPostRescheduled?: () => void
}

export default function PostCalendar({ onPostRescheduled }: PostCalendarProps) {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [draggedPost, setDraggedPost] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  useEffect(() => {
    fetchPosts()
  }, [currentDate])

  async function fetchPosts() {
    setLoading(true)
    try {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()

      // Get first day of month and last day of month with padding for calendar view
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)

      // Extend range to include visible days from prev/next months
      const start = new Date(firstDay)
      start.setDate(start.getDate() - firstDay.getDay())

      const end = new Date(lastDay)
      end.setDate(end.getDate() + (6 - lastDay.getDay()))

      const response = await fetch(
        `/api/posts/calendar?start=${start.toISOString()}&end=${end.toISOString()}`
      )
      const data = await response.json()
      setPosts(data.posts || [])
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    } finally {
      setLoading(false)
    }
  }

  async function reschedulePost(postId: string, newDate: Date) {
    try {
      const response = await fetch(`/api/posts/${postId}/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: newDate.toISOString() }),
      })

      if (response.ok) {
        await fetchPosts()
        onPostRescheduled?.()
      } else {
        const data = await response.json()
        alert(`Failed to reschedule: ${data.error}`)
      }
    } catch (error) {
      console.error('Failed to reschedule post:', error)
      alert('Failed to reschedule post')
    }
  }

  function getCalendarDays() {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const days: { date: Date; isCurrentMonth: boolean }[] = []

    // Add days from previous month
    for (let i = 0; i < firstDay.getDay(); i++) {
      const date = new Date(year, month, -firstDay.getDay() + i + 1)
      days.push({ date, isCurrentMonth: false })
    }

    // Add days from current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true })
    }

    // Add days from next month to complete the grid
    const remainingDays = 42 - days.length // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false })
    }

    return days
  }

  function getPostsForDate(date: Date) {
    return posts.filter(post => {
      const postDate = new Date(post.scheduledAt)
      return (
        postDate.getFullYear() === date.getFullYear() &&
        postDate.getMonth() === date.getMonth() &&
        postDate.getDate() === date.getDate()
      )
    })
  }

  function isToday(date: Date) {
    const today = new Date()
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    )
  }

  function formatDateKey(date: Date) {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
  }

  function handleDragStart(e: React.DragEvent, postId: string) {
    e.dataTransfer.setData('postId', postId)
    setDraggedPost(postId)
  }

  function handleDragEnd() {
    setDraggedPost(null)
    setDropTarget(null)
  }

  function handleDragOver(e: React.DragEvent, dateKey: string) {
    e.preventDefault()
    setDropTarget(dateKey)
  }

  function handleDragLeave() {
    setDropTarget(null)
  }

  function handleDrop(e: React.DragEvent, date: Date) {
    e.preventDefault()
    const postId = e.dataTransfer.getData('postId')
    if (postId) {
      // Set time to noon on the target date
      const newDate = new Date(date)
      newDate.setHours(12, 0, 0, 0)
      reschedulePost(postId, newDate)
    }
    setDropTarget(null)
  }

  function handleDayClick(date: Date) {
    // Navigate to new-post with date pre-filled
    const dateStr = date.toISOString().split('T')[0]
    router.push(`/dashboard/new-post?date=${dateStr}`)
  }

  function prevMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  function nextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  function goToToday() {
    setCurrentDate(new Date())
  }

  const calendarDays = getCalendarDays()

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={prevMonth}
            className="glass-button px-3 py-2 rounded-lg text-gray-300 hover:text-white transition"
          >
            ←
          </button>
          <h2 className="text-xl font-semibold text-white min-w-[200px] text-center">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button
            onClick={nextMonth}
            className="glass-button px-3 py-2 rounded-lg text-gray-300 hover:text-white transition"
          >
            →
          </button>
        </div>
        <button
          onClick={goToToday}
          className="glass-button px-4 py-2 rounded-lg text-gray-300 hover:text-white transition"
        >
          Today
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-reddit-orange"></div>
          <p className="text-gray-400 mt-2">Loading calendar...</p>
        </div>
      ) : (
        <div className="border border-gray-700 rounded-lg overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 bg-[#1a1a24]">
            {dayNames.map((day) => (
              <div
                key={day}
                className="px-2 py-3 text-center text-sm font-semibold text-gray-400 border-b border-gray-700"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map(({ date, isCurrentMonth }, index) => {
              const dateKey = formatDateKey(date)
              const dayPosts = getPostsForDate(date)
              const isDropping = dropTarget === dateKey

              return (
                <div
                  key={index}
                  className={`
                    min-h-[120px] p-2 border-b border-r border-gray-700
                    ${isCurrentMonth ? 'bg-[#12121a]' : 'bg-[#0a0a0f]'}
                    ${isToday(date) ? 'ring-2 ring-inset ring-[#00D9FF]' : ''}
                    ${isDropping ? 'bg-[#1a2a3a]' : ''}
                    transition-colors
                  `}
                  onDragOver={(e) => handleDragOver(e, dateKey)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, date)}
                  onClick={() => handleDayClick(date)}
                >
                  <div className={`text-sm mb-1 ${isCurrentMonth ? 'text-gray-300' : 'text-gray-600'}`}>
                    {date.getDate()}
                  </div>

                  <div className="space-y-1">
                    {dayPosts.slice(0, 3).map((post) => (
                      <div
                        key={post.id}
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation()
                          handleDragStart(e, post.id)
                        }}
                        onDragEnd={handleDragEnd}
                        onClick={(e) => e.stopPropagation()}
                        className={`
                          text-xs p-1.5 rounded cursor-grab truncate
                          ${post.status === 'posted'
                            ? 'bg-green-900/50 text-green-300 border border-green-700'
                            : post.status === 'failed'
                            ? 'bg-red-900/50 text-red-300 border border-red-700'
                            : 'bg-blue-900/50 text-blue-300 border border-blue-700'
                          }
                          ${draggedPost === post.id ? 'opacity-50' : ''}
                          hover:opacity-80 transition
                        `}
                        title={`${post.title} - r/${post.subreddit.name}`}
                      >
                        <span className="font-medium">r/{post.subreddit.name}</span>
                        <div className="truncate text-gray-400">{post.title}</div>
                      </div>
                    ))}
                    {dayPosts.length > 3 && (
                      <div className="text-xs text-gray-500 pl-1">
                        +{dayPosts.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-900/50 border border-blue-700"></div>
          <span>Scheduled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-900/50 border border-green-700"></div>
          <span>Posted</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-900/50 border border-red-700"></div>
          <span>Failed</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-gray-500">Drag posts to reschedule • Click a day to create post</span>
        </div>
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'
import PostCalendar from '@/components/PostCalendar'

export default function CalendarPage() {
  return (
    <>
      <div className="flex justify-center gap-3 mb-6">
        <Link
          href="/dashboard/new-post"
          className="bg-reddit-orange text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-orange-600 transition font-medium text-sm sm:text-base"
        >
          + New Post
        </Link>
      </div>

      <div className="feature-card rounded-lg p-4 sm:p-6">
        <PostCalendar />
      </div>

      <div className="text-center mt-8">
        <Link href="/" className="text-gray-400 hover:text-white transition">
          ← Back to Home
        </Link>
      </div>
    </>
  )
}

'use client'

import Link from 'next/link'
import CommentsPanel from '@/components/CommentsPanel'

export default function CommentsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Comment Management</h1>
            <p className="text-gray-600 mt-1">Monitor and respond to comments on your posts</p>
          </div>
          <Link
            href="/dashboard"
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <CommentsPanel />
        </div>
      </div>
    </div>
  )
}

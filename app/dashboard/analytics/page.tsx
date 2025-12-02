'use client'

import Link from 'next/link'
import AnalyticsDashboard from '@/components/AnalyticsDashboard'

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics & Insights</h1>
            <p className="text-gray-600 mt-1">Track performance and optimize your Reddit strategy</p>
          </div>
          <Link
            href="/dashboard"
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <AnalyticsDashboard />
      </div>
    </div>
  )
}

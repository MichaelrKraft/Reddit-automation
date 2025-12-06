'use client'

import Link from 'next/link'
import AnalyticsDashboard from '@/components/AnalyticsDashboard'
import DashboardNav from '@/components/DashboardNav'

export default function AnalyticsPage() {
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
        <DashboardNav />
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Analytics & Insights</h1>
            <p className="text-gray-400 mt-1">Track performance and optimize your Reddit strategy</p>
          </div>
          <Link
            href="/dashboard"
            className="glass-button text-gray-300 px-6 py-2 rounded-lg transition"
          >
            ← Back
          </Link>
        </div>

        <AnalyticsDashboard />
      </div>
    </div>
  )
}

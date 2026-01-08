'use client'

import Link from 'next/link'
import AnalyticsDashboard from '@/components/AnalyticsDashboard'
import AnalyzeBusinessSection from '@/components/AnalyzeBusinessSection'

export default function Dashboard() {
  return (
    <>
      <div className="mb-6">
        <AnalyzeBusinessSection />
      </div>

      <AnalyticsDashboard />

      <div className="text-center mt-8">
        <Link href="/" className="text-gray-400 hover:text-white transition">
          ← Back to Home
        </Link>
      </div>
    </>
  )
}

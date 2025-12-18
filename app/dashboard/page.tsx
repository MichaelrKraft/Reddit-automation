'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import FounderBanner from '@/components/FounderBanner'
import UserDropdown from '@/components/UserDropdown'
import AnalyticsDashboard from '@/components/AnalyticsDashboard'
import DashboardNav from '@/components/DashboardNav'

interface UserStats {
  isLoggedIn: boolean
  tier?: string
  signupNumber?: number
  hasLifetimeDeal?: boolean
  founderSpotsRemaining: number
  isFounder?: boolean
  canPurchaseLifetime?: boolean
}

export default function Dashboard() {
  const [userStats, setUserStats] = useState<UserStats | null>(null)

  useEffect(() => {
    fetchUserStats()
  }, [])

  async function fetchUserStats() {
    try {
      const response = await fetch('/api/user/stats')
      const data = await response.json()
      setUserStats(data)
    } catch (error) {
      console.error('Failed to fetch user stats:', error)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      {/* Founder Banner - shows for founders who haven't purchased lifetime deal */}
      {userStats?.canPurchaseLifetime && (
        <FounderBanner
          signupNumber={userStats.signupNumber || 0}
          founderSpotsRemaining={userStats.founderSpotsRemaining}
          hasLifetimeDeal={userStats.hasLifetimeDeal || false}
          canPurchaseLifetime={userStats.canPurchaseLifetime}
        />
      )}

      {/* Dot Grid Background */}
      <div className="dot-grid-background">
        <div className="dot-grid-container">
          <div className="dot-grid"></div>
          <div className="dot-grid-overlay"></div>
        </div>
      </div>

      {/* Header with Logo and User Dropdown */}
      <div className={`absolute z-20 px-4 sm:px-6 lg:px-8 max-w-7xl left-1/2 -translate-x-1/2 w-full ${userStats?.canPurchaseLifetime ? 'top-16' : 'top-4 sm:top-6'}`}>
        <div className="flex justify-between items-start">
          <Link href="/">
            <img
              src="/reddride-logo-dark.png"
              alt="ReddRide - The Reddit AI Automation Platform"
              className="h-16 sm:h-[101px] object-contain cursor-pointer"
            />
          </Link>
          <UserDropdown />
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 sm:pt-40 pb-16">
        <div className="mb-8">
          <div className="mb-4 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400 mt-1 text-sm sm:text-base">Track performance and optimize your Reddit strategy</p>
          </div>
          <DashboardNav />
        </div>

        <AnalyticsDashboard />

        <div className="text-center mt-8">
          <Link href="/" className="text-gray-400 hover:text-white transition">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}

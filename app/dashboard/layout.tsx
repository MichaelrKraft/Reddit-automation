'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import FounderBanner from '@/components/FounderBanner'
import UserDropdown from '@/components/UserDropdown'
import DashboardNav from '@/components/DashboardNav'

// Page title mappings for dynamic header
const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': {
    title: 'Dashboard',
    subtitle: 'Track performance and optimize your Reddit strategy'
  },
  '/dashboard/new-post': {
    title: 'Create New Post',
    subtitle: 'Schedule a post to Reddit'
  },
  '/dashboard/warmup': {
    title: 'Warmup Dashboard',
    subtitle: 'Monitor and manage Reddit account warm-up system'
  },
  '/dashboard/spy-mode': {
    title: 'Spy Mode',
    subtitle: 'Monitor competitor Reddit activity'
  },
  '/dashboard/leaderboard': {
    title: 'Leaderboard',
    subtitle: 'Top performing posts and accounts'
  },
  '/dashboard/opportunities': {
    title: 'Opportunities',
    subtitle: 'Discover high-potential posting opportunities'
  },
  '/dashboard/speed-alerts': {
    title: 'AI Alerts',
    subtitle: 'Real-time notifications for trending content'
  },
  '/dashboard/seo-finder': {
    title: 'SEO Finder',
    subtitle: 'Find SEO opportunities on Reddit'
  },
  '/dashboard/comments': {
    title: 'Comments',
    subtitle: 'Manage and track your comments'
  },
  '/dashboard/posts': {
    title: 'Posts',
    subtitle: 'View and manage your scheduled posts'
  },
  '/dashboard/calendar': {
    title: 'Calendar',
    subtitle: 'Schedule and plan your content'
  },
  '/dashboard/drafts': {
    title: 'Drafts',
    subtitle: 'Manage your saved drafts'
  },
  '/dashboard/analytics': {
    title: 'Analytics',
    subtitle: 'Track your Reddit performance'
  },
  '/dashboard/keyword-alerts': {
    title: 'Keyword Alerts',
    subtitle: 'Monitor Reddit for high-intent keywords'
  },
}

interface UserStats {
  isLoggedIn: boolean
  tier?: string
  signupNumber?: number
  hasLifetimeDeal?: boolean
  founderSpotsRemaining: number
  isFounder?: boolean
  canPurchaseLifetime?: boolean
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [userStats, setUserStats] = useState<UserStats | null>(null)

  // Get page title based on current path
  const { title, subtitle } = pageTitles[pathname || '/dashboard'] || pageTitles['/dashboard']

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
    <div className="min-h-screen bg-[#0a0a0f] relative">
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

      {/* Main layout with sidebar */}
      <div className={`flex h-screen ${userStats?.canPurchaseLifetime ? 'pt-12' : ''}`}>
        {/* Sidebar */}
        <DashboardNav />

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header with centered Page Title and User Dropdown */}
          <header className="relative z-20 px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center max-w-7xl mx-auto">
              {/* Spacer for centering */}
              <div className="w-10"></div>

              {/* Centered title - dynamic based on current page */}
              <div className="text-center flex-1">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">{title}</h1>
                <p className="text-gray-400 text-sm sm:text-base">{subtitle}</p>
              </div>

              <UserDropdown />
            </div>
          </header>

          {/* Page content with scroll */}
          <main className="flex-1 overflow-y-auto relative z-10">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import {
  LayoutDashboard,
  Users,
  BarChart3,
  CreditCard,
  ArrowLeft,
  Shield,
  Server,
  Activity
} from 'lucide-react'

// Page title mappings
const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/admin': {
    title: 'Admin Dashboard',
    subtitle: 'Platform analytics and user management'
  },
  '/admin/users': {
    title: 'User Management',
    subtitle: 'View and manage all users'
  },
  '/admin/analytics': {
    title: 'Analytics',
    subtitle: 'Feature usage and conversion tracking'
  },
  '/admin/payments': {
    title: 'Payments',
    subtitle: 'Stripe transactions and revenue tracking'
  },
  '/admin/accounts': {
    title: 'Account Health',
    subtitle: 'Reddit account warmup and shadowban monitoring'
  },
  '/admin/system': {
    title: 'System Health',
    subtitle: 'Queue status, workers, and error monitoring'
  }
}

const navItems = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/accounts', label: 'Account Health', icon: Activity },
  { href: '/admin/system', label: 'System', icon: Server },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 }
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  const { title, subtitle } = pageTitles[pathname || '/admin'] || pageTitles['/admin']

  // Check admin status
  useEffect(() => {
    async function checkAdmin() {
      if (!isLoaded || !user) {
        setIsChecking(false)
        return
      }

      try {
        const response = await fetch('/api/admin/stats')
        if (response.status === 403) {
          setIsAdmin(false)
          router.push('/dashboard')
        } else if (response.ok) {
          setIsAdmin(true)
        } else {
          setIsAdmin(false)
          router.push('/dashboard')
        }
      } catch {
        setIsAdmin(false)
        router.push('/dashboard')
      } finally {
        setIsChecking(false)
      }
    }

    checkAdmin()
  }, [isLoaded, user, router])

  // Show loading state
  if (isChecking || isAdmin === null) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-orange-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-400">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  // Not admin - will redirect
  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex relative">
      {/* ADMIN Badge - Top Right of Entire Page */}
      <span className="absolute top-4 right-4 text-xs text-orange-500 font-medium bg-orange-500/10 px-2 py-1 rounded z-50">ADMIN</span>

      {/* Admin Sidebar */}
      <aside className="w-64 bg-[#111118] border-r border-gray-800 flex flex-col">
        {/* Logo/Header */}
        <div className="p-4 border-b border-gray-800">
          <img
            src="/reddride-logo.png"
            alt="ReddRide"
            className="h-24 w-auto"
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-orange-500/10 text-orange-500'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Back to Dashboard */}
        <div className="p-4 border-t border-gray-800">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Dashboard</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-[#111118] border-b border-gray-800 px-8 py-6">
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

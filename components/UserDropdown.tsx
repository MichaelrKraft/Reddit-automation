'use client'

import { useState, useEffect, useRef } from 'react'
import { useClerk, useUser } from '@clerk/nextjs'

interface UserStats {
  tier?: string
  signupNumber?: number
  hasLifetimeDeal?: boolean
}

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { signOut } = useClerk()
  const { user } = useUser()

  useEffect(() => {
    fetchUserStats()
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
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

  const tierColors: Record<string, string> = {
    FOUNDER: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    ALPHA: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
    STANDARD: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
  }

  const email = user?.emailAddresses?.[0]?.emailAddress || ''
  const tier = userStats?.tier || 'ALPHA'

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 rounded-lg px-3 py-2 transition"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00D9FF] to-cyan-600 flex items-center justify-center text-white font-semibold text-sm">
          {email.charAt(0).toUpperCase()}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-[#1a1a24] border border-gray-700 rounded-lg shadow-xl z-50">
          <div className="p-4 border-b border-gray-700">
            <p className="text-white font-medium truncate">{email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs px-2 py-1 rounded border ${tierColors[tier]}`}>
                {tier}
              </span>
              {userStats?.signupNumber && (
                <span className="text-xs text-gray-500">
                  User #{userStats.signupNumber}
                </span>
              )}
            </div>
            {userStats?.hasLifetimeDeal && (
              <p className="text-xs text-green-400 mt-2">✓ Lifetime Deal Active</p>
            )}
          </div>
          <div className="p-2">
            <button
              onClick={() => signOut({ redirectUrl: '/' })}
              className="w-full text-left px-3 py-2 text-gray-300 hover:bg-gray-700/50 rounded-lg transition flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

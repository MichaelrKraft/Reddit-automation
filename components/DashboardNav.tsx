'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard/spy-mode', label: 'Spy Mode', highlight: true },
  { href: '/dashboard/speed-alerts', label: 'Speed Alerts' },
  { href: '/dashboard/viral', label: 'Viral Optimizer' },
  { href: '/dashboard/timing', label: 'Optimal Times' },
  { href: '/dashboard/analytics', label: 'Analytics' },
  { href: '/dashboard/comments', label: 'Comments' },
  { href: '/dashboard/discover', label: 'Discover' },
  { href: '/dashboard/calendar', label: 'Calendar' },
]

export default function DashboardNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap gap-3 mb-8">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')

        if (item.highlight) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                isActive
                  ? 'bg-[#00D9FF] text-black'
                  : 'bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 hover:bg-[#00D9FF]/30'
              }`}
            >
              {item.label}
            </Link>
          )
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-6 py-2 rounded-lg transition ${
              isActive
                ? 'bg-[#00D9FF] text-black font-semibold'
                : 'glass-button text-gray-300 hover:text-white'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard/new-post', label: '+ New Post' },
  { href: '/warmup', label: 'Warmup' },
  { href: '/dashboard/spy-mode', label: 'Spy Mode' },
  { href: '/dashboard/speed-alerts', label: 'AI Alerts' },
  { href: '/dashboard/posts', label: 'Posts' },
  { href: '/dashboard/calendar', label: 'Calendar' },
  { href: '/dashboard/comments', label: 'Comments' },
  { href: '/dashboard/seo-finder', label: 'SEO Finder' },
]

export default function DashboardNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap gap-2 sm:gap-3 mt-6 sm:mt-8 mb-6 sm:mb-8">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
        const isHighlight = 'highlight' in item && item.highlight
        const isPremium = 'premium' in item && item.premium

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg transition font-semibold text-sm sm:text-base ${
              isHighlight
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 border-0'
                : isPremium
                  ? 'bg-gradient-to-r from-yellow-500/20 to-amber-600/20 text-yellow-400 border border-yellow-500/50 hover:bg-yellow-500/30'
                  : `bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 hover:bg-[#00D9FF]/30 ${
                      isActive ? 'bg-[#00D9FF]/40' : ''
                    }`
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

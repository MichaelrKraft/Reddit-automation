'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard/spy-mode', label: 'Spy Mode' },
  { href: '/dashboard/speed-alerts', label: 'Speed Alerts' },
  { href: '/dashboard/timing', label: 'Optimal Times' },
  { href: '/dashboard/posts', label: 'Posts' },
  { href: '/dashboard/comments', label: 'Comments' },
  { href: '/dashboard/calendar', label: 'Calendar' },
  { href: '/warmup', label: 'Warmup' },
  { href: '/dashboard/new-post', label: '+ New Post' },
  { href: '/dashboard/viral', label: 'Viral Optimizer' },
]

export default function DashboardNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap gap-2 sm:gap-3 mb-6 sm:mb-8">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg hover:bg-[#00D9FF]/30 transition font-semibold text-sm sm:text-base ${
              isActive ? 'bg-[#00D9FF]/40' : ''
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

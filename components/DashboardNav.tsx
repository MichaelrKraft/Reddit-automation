'use client'

import { usePathname } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import {
  IconPlus,
  IconFlame,
  IconEye,
  IconTrophy,
  IconBulb,
  IconBell,
  IconSearch,
  IconMessageCircle,
  IconFileText,
  IconCalendar,
  IconLayoutDashboard,
} from '@tabler/icons-react'
import { Sidebar, SidebarBody, SidebarLink, useSidebar } from '@/components/ui/sidebar'

// Logo component that shows/hides based on sidebar state
function SidebarLogo() {
  const { open } = useSidebar()
  return (
    <Link href="/" className="flex items-center justify-center mb-4">
      <img
        src="/reddride-logo-dark.png"
        alt="ReddRide"
        className={`object-contain transition-all duration-300 ${open ? 'h-[72px] w-auto' : 'h-12 w-12 object-cover'}`}
      />
    </Link>
  )
}

// Dashboard item at top (separate)
const dashboardItem = { href: '/dashboard', label: 'Dashboard', icon: <IconLayoutDashboard className="h-5 w-5 flex-shrink-0" /> }

// Other nav items (will be spaced down)
const navItems = [
  { href: '/dashboard/new-post', label: 'New Post', icon: <IconPlus className="h-5 w-5 flex-shrink-0" /> },
  { href: '/dashboard/warmup', label: 'Warmup', icon: <IconFlame className="h-5 w-5 flex-shrink-0" /> },
  { href: '/dashboard/spy-mode', label: 'Spy Mode', icon: <IconEye className="h-5 w-5 flex-shrink-0" /> },
  { href: '/dashboard/leaderboard', label: 'Leaderboard', icon: <IconTrophy className="h-5 w-5 flex-shrink-0" /> },
  { href: '/dashboard/opportunities', label: 'Opportunity', icon: <IconBulb className="h-5 w-5 flex-shrink-0" /> },
  { href: '/dashboard/speed-alerts', label: 'AI Alerts', icon: <IconBell className="h-5 w-5 flex-shrink-0" /> },
  { href: '/dashboard/seo-finder', label: 'SEO Traffic', icon: <IconSearch className="h-5 w-5 flex-shrink-0" /> },
  { href: '/dashboard/comments', label: 'Comments', icon: <IconMessageCircle className="h-5 w-5 flex-shrink-0" /> },
  { href: '/dashboard/posts', label: 'Posts', icon: <IconFileText className="h-5 w-5 flex-shrink-0" /> },
  { href: '/dashboard/calendar', label: 'Calendar', icon: <IconCalendar className="h-5 w-5 flex-shrink-0" /> },
]

export default function DashboardNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(true)

  const dashboardLink = {
    label: dashboardItem.label,
    href: dashboardItem.href,
    icon: dashboardItem.icon,
  }

  const links = navItems.map((item) => ({
    label: item.label,
    href: item.href,
    icon: item.icon,
  }))

  return (
    <Sidebar open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between gap-10">
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          {/* Logo at top */}
          <SidebarLogo />

          {/* Dashboard below logo */}
          <div className="mt-2">
            <SidebarLink
              link={dashboardLink}
              isActive={pathname === dashboardLink.href}
            />
          </div>

          {/* Other items with significant spacing below Dashboard */}
          <div className="mt-16 flex flex-col gap-4">
            {links.map((link) => {
              const isActive = pathname === link.href ||
                pathname?.startsWith(link.href + '/')
              return (
                <SidebarLink
                  key={link.href}
                  link={link}
                  isActive={isActive}
                />
              )
            })}
          </div>
        </div>
      </SidebarBody>
    </Sidebar>
  )
}

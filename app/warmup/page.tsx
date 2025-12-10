import WarmupDashboard from '@/components/WarmupDashboard'
import Link from 'next/link'

export default function WarmupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#12121a] to-[#1a1a24] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Logo */}
        <div className="mb-6">
          <Link href="/">
            <img
              src="/reddride-logo-dark.png"
              alt="ReddRide - The Reddit AI Automation Platform"
              className="h-[101px] object-contain cursor-pointer"
            />
          </Link>
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Link
            href="/dashboard"
            className="bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-6 py-2 rounded-lg hover:bg-[#00D9FF]/30 transition font-semibold"
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/spy-mode"
            className="bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-6 py-2 rounded-lg hover:bg-[#00D9FF]/30 transition font-semibold"
          >
            Spy Mode
          </Link>
          <Link
            href="/dashboard/speed-alerts"
            className="bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-6 py-2 rounded-lg hover:bg-[#00D9FF]/30 transition font-semibold"
          >
            Speed Alerts
          </Link>
          <Link
            href="/dashboard/viral"
            className="bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-6 py-2 rounded-lg hover:bg-[#00D9FF]/30 transition font-semibold"
          >
            Viral Optimizer
          </Link>
          <Link
            href="/dashboard/timing"
            className="bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-6 py-2 rounded-lg hover:bg-[#00D9FF]/30 transition font-semibold"
          >
            Optimal Times
          </Link>
          <Link
            href="/dashboard/analytics"
            className="bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-6 py-2 rounded-lg hover:bg-[#00D9FF]/30 transition font-semibold"
          >
            Analytics
          </Link>
          <Link
            href="/dashboard/comments"
            className="bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-6 py-2 rounded-lg hover:bg-[#00D9FF]/30 transition font-semibold"
          >
            Comments
          </Link>
          <Link
            href="/dashboard/calendar"
            className="bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-6 py-2 rounded-lg hover:bg-[#00D9FF]/30 transition font-semibold"
          >
            Calendar
          </Link>
          <Link
            href="/warmup"
            className="bg-[#00D9FF]/30 text-[#00D9FF] border border-[#00D9FF] px-6 py-2 rounded-lg font-semibold"
          >
            Warmup
          </Link>
          <Link
            href="/dashboard/new-post"
            className="bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-6 py-2 rounded-lg hover:bg-[#00D9FF]/30 transition font-semibold"
          >
            + New Post
          </Link>
        </div>

        <WarmupDashboard />
      </div>
    </div>
  )
}

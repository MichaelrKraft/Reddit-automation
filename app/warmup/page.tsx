import WarmupDashboard from '@/components/WarmupDashboard'
import Link from 'next/link'

export default function WarmupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#12121a] to-[#1a1a24] px-4 sm:px-6 py-6 sm:py-8">
      <div className="max-w-7xl mx-auto">
        {/* Logo */}
        <div className="mb-4 sm:mb-6">
          <Link href="/">
            <img
              src="/reddride-logo-dark.png"
              alt="ReddRide - The Reddit AI Automation Platform"
              className="h-16 sm:h-[101px] object-contain cursor-pointer"
            />
          </Link>
        </div>

        {/* Back Button */}
        <div className="mb-6 sm:mb-8">
          <Link
            href="/dashboard"
            className="glass-button text-gray-300 px-4 sm:px-6 py-2 rounded-lg transition text-sm sm:text-base"
          >
            ← Back
          </Link>
        </div>

        <WarmupDashboard />
      </div>
    </div>
  )
}

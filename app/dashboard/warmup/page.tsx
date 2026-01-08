import WarmupDashboard from '@/components/WarmupDashboard'
import Link from 'next/link'

export default function WarmupPage() {
  return (
    <>
      <WarmupDashboard />

      <div className="text-center mt-8">
        <Link href="/" className="text-gray-400 hover:text-white transition">
          ← Back to Home
        </Link>
      </div>
    </>
  )
}

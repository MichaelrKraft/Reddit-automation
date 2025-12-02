import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          🤖 Reddit Automation Platform
        </h1>
        <p className="text-center text-lg mb-4">
          AI-Powered Reddit Marketing Automation
        </p>
        <div className="text-center mb-8">
          <Link 
            href="/dashboard"
            className="inline-block bg-reddit-orange text-white px-8 py-3 rounded-lg text-lg hover:bg-orange-600 transition"
          >
            Go to Dashboard →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          <div className="border border-gray-300 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">📅 Post Scheduling</h2>
            <p className="text-sm text-gray-600">Schedule posts to multiple subreddits</p>
          </div>
          <div className="border border-gray-300 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">🤖 AI Content</h2>
            <p className="text-sm text-gray-600">Generate engaging content with AI</p>
          </div>
          <div className="border border-gray-300 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">🔍 Discovery</h2>
            <p className="text-sm text-gray-600">Find relevant subreddits automatically</p>
          </div>
          <div className="border border-gray-300 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">💬 Auto-Replies</h2>
            <p className="text-sm text-gray-600">Engage with comments automatically</p>
          </div>
          <div className="border border-gray-300 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">📊 Analytics</h2>
            <p className="text-sm text-gray-600">Track performance and engagement</p>
          </div>
          <div className="border border-gray-300 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">🚀 Coming Soon</h2>
            <p className="text-sm text-gray-600">More features in development</p>
          </div>
        </div>
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            Powered by Next.js, Gemini AI, and PostgreSQL
          </p>
        </div>
      </div>
    </main>
  )
}

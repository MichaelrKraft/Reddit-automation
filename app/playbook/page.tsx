'use client'

import Link from 'next/link'
import ShinyText from '@/components/ShinyText'

export default function PlaybookPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#12121a] to-[#0a0a0f]">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-2 flex flex-col items-center">
          <a href="https://reddride.com" className="flex items-center justify-center">
            <img src="/reddride-logo.png" alt="ReddRide" className="h-12 scale-[2] origin-center" />
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <span className="inline-block bg-[#00D9FF]/10 text-[#00D9FF] px-4 py-1 rounded-full text-sm font-medium mb-4">
            FREE DOWNLOAD
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            <ShinyText>The Reddit Marketing Playbook</ShinyText>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            The complete guide to growing your business on Reddit without getting banned.
            Learn the strategies that actually work in 2025.
          </p>
        </div>

        {/* Download Card */}
        <div className="bg-gradient-to-br from-[#1a1a24] to-[#12121a] border border-gray-700 rounded-2xl p-8 md:p-12 text-center">
          <div className="w-20 h-20 bg-[#00D9FF]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-[#00D9FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-white mb-4">
            Download Your Free Copy
          </h2>

          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            No email required. No signup needed. Just click and download the complete playbook instantly.
          </p>

          <a
            href="/reddit-marketing-playbook.pdf"
            download="The-Reddit-Marketing-Playbook.pdf"
            className="inline-flex items-center gap-3 bg-gradient-to-r from-[#00D9FF] to-cyan-600 text-black px-8 py-4 rounded-xl font-bold text-lg hover:from-cyan-400 hover:to-cyan-500 transition shadow-lg shadow-cyan-500/25"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download PDF (Free)
          </a>

          <p className="text-sm text-gray-500 mt-4">
            PDF format &bull; 510 KB
          </p>
        </div>

        {/* CTA Button */}
        <div className="mt-10 text-center">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 bg-[#00D9FF] text-black px-6 py-3 rounded-lg font-medium hover:bg-cyan-400 transition"
          >
            Try ReddRide Free
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* What's Inside */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-white text-center mb-8">
            What You'll Learn
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: 'Reddit Algorithm Secrets', desc: 'Understand how Reddit ranks content and use it to your advantage' },
              { title: 'Subreddit Research', desc: 'Find the perfect communities where your target customers hang out' },
              { title: 'Content That Converts', desc: 'Write posts that get upvotes AND drive traffic to your business' },
              { title: 'Avoid Getting Banned', desc: 'The rules every marketer needs to know to stay in good standing' },
              { title: 'Account Warmup Strategy', desc: 'Build credibility before promoting anything' },
              { title: 'Viral Post Formulas', desc: 'Templates and patterns from posts that went viral' },
            ].map((item, i) => (
              <div key={i} className="flex gap-4 p-4 bg-[#1a1a24]/50 rounded-lg border border-gray-800">
                <div className="w-8 h-8 bg-[#00D9FF]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-[#00D9FF]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-white">{item.title}</h4>
                  <p className="text-sm text-gray-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <p className="text-gray-400 mb-4">
            Ready to automate your Reddit marketing?
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition"
          >
            Try ReddRide Free
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} ReddRide. All rights reserved.
        </div>
      </footer>
    </div>
  )
}

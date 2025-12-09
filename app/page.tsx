'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import FounderBanner from '@/components/FounderBanner';

interface UserStats {
  isLoggedIn: boolean
  tier?: string
  signupNumber?: number
  hasLifetimeDeal?: boolean
  founderSpotsRemaining: number
  isFounder?: boolean
  canPurchaseLifetime?: boolean
}

export default function Home() {
  const [isVisible, setIsVisible] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  useEffect(() => {
    setIsVisible(true);
    fetchUserStats();
  }, []);

  async function fetchUserStats() {
    try {
      const response = await fetch('/api/user/stats');
      const data = await response.json();
      setUserStats(data);
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    }
  }

  const features = [
    {
      icon: '📅',
      title: 'Post Scheduling',
      description: 'Schedule posts to multiple subreddits at optimal times for maximum engagement',
      href: '/dashboard/new-post',
      color: 'from-blue-500/10 to-cyan-500/10 border-blue-500/20 hover:border-blue-500/40'
    },
    {
      icon: '🤖',
      title: 'AI Content Generation',
      description: 'Create engaging, subreddit-specific content powered by Gemini AI',
      href: '/dashboard/viral',
      color: 'from-purple-500/10 to-pink-500/10 border-purple-500/20 hover:border-purple-500/40'
    },
    {
      icon: '🔍',
      title: 'Subreddit Discovery',
      description: 'Find relevant communities automatically based on your niche and target audience',
      href: '/dashboard/discover',
      color: 'from-green-500/10 to-emerald-500/10 border-green-500/20 hover:border-green-500/40'
    },
    {
      icon: '💬',
      title: 'Auto-Replies',
      description: 'Engage with comments automatically using AI-powered contextual responses',
      href: '/dashboard/comments',
      color: 'from-orange-500/10 to-red-500/10 border-orange-500/20 hover:border-orange-500/40'
    },
    {
      icon: '📊',
      title: 'Analytics Dashboard',
      description: 'Track performance metrics and engagement across all your Reddit campaigns',
      href: '/dashboard/analytics',
      color: 'from-indigo-500/10 to-blue-500/10 border-indigo-500/20 hover:border-indigo-500/40'
    },
    {
      icon: '⏰',
      title: 'Optimal Timing',
      description: 'Post at the best times for engagement based on subreddit activity patterns',
      href: '/dashboard/timing',
      color: 'from-yellow-500/10 to-orange-500/10 border-yellow-500/20 hover:border-yellow-500/40'
    },
    {
      icon: '🕵️',
      title: 'Spy Mode',
      description: 'Monitor competitor Reddit activity in real-time and steal their winning strategies',
      href: '/dashboard/spy-mode',
      color: 'from-cyan-500/10 to-teal-500/10 border-cyan-500/20 hover:border-cyan-500/40'
    },
    {
      icon: '🚀',
      title: 'Viral Optimizer',
      description: 'AI analyzes viral patterns to optimize your content for maximum reach and engagement',
      href: '/dashboard/viral',
      color: 'from-pink-500/10 to-rose-500/10 border-pink-500/20 hover:border-pink-500/40'
    },
    {
      icon: '⚡',
      title: 'Speed Alerts',
      description: 'Get instant notifications when posts gain traction so you can engage at the right moment',
      href: '/dashboard/alerts',
      color: 'from-amber-500/10 to-yellow-500/10 border-amber-500/20 hover:border-amber-500/40'
    }
  ];

  // Calculate spots remaining for display
  const spotsRemaining = userStats?.founderSpotsRemaining ?? 10;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Alpha Banner - Dynamic based on user status */}
      <div className="bg-gradient-to-r from-orange-500 to-pink-500 text-white text-center py-2 px-4">
        <span className="font-semibold">
          {userStats?.isFounder ? (
            <>🎉 You're one of our first 10 founders! Thank you for believing in us!</>
          ) : spotsRemaining > 0 ? (
            <>🎉 Alpha Launch: Only {spotsRemaining} founder spot{spotsRemaining !== 1 ? 's' : ''} left for lifetime deal!</>
          ) : (
            <>🎉 Alpha Launch: Join now for FREE access during alpha!</>
          )}
        </span>
      </div>

      {/* Founder Banner - shows for logged-in founders who haven't purchased */}
      {userStats?.canPurchaseLifetime && (
        <FounderBanner
          signupNumber={userStats.signupNumber || 0}
          founderSpotsRemaining={userStats.founderSpotsRemaining}
          hasLifetimeDeal={userStats.hasLifetimeDeal || false}
          canPurchaseLifetime={userStats.canPurchaseLifetime}
        />
      )}

      {/* Navigation */}
      <nav className="fixed top-8 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🤖</span>
            <span className="text-xl font-bold text-slate-900">RedRide</span>
          </div>
          <Link
            href="/signup"
            className="px-6 py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-all hover:shadow-lg hover:shadow-slate-900/20"
          >
            Get Started →
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6">
        <div className={`max-w-7xl mx-auto text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="inline-block mb-4 px-4 py-2 bg-slate-900/5 border border-slate-900/10 rounded-full">
            <span className="text-sm font-medium text-slate-700">AI-Powered Reddit Marketing</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-6 leading-tight">
            Make Money with Reddit
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Using Simple AI
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            Turn Reddit into your <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent font-semibold">#1 Customer source</span> with authentic account building, automated posting, and intelligent engagement.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/signup"
              className="px-8 py-4 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all hover:shadow-xl hover:shadow-slate-900/20 hover:-translate-y-0.5"
            >
              Join Alpha Free
            </Link>
            <a
              href="#features"
              className="px-8 py-4 bg-white border-2 border-slate-200 text-slate-900 rounded-xl font-semibold hover:border-slate-300 transition-all hover:shadow-lg"
            >
              See Features
            </a>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div>
              <div className="text-3xl font-bold text-slate-900">10+</div>
              <div className="text-sm text-slate-600 mt-1">Features</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-900">Alpha</div>
              <div className="text-sm text-slate-600 mt-1">Launch Ready</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-900">Free</div>
              <div className="text-sm text-slate-600 mt-1">For Early Users</div>
            </div>
          </div>
        </div>
      </section>

      {/* App Preview Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Powerful Dashboard
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Manage all your Reddit marketing from one beautiful interface
            </p>
          </div>

          {/* Dashboard Mockup */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-3xl"></div>
            <div className="relative bg-slate-950 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
              {/* Browser Chrome */}
              <div className="bg-slate-800 px-4 py-3 flex items-center gap-2 border-b border-slate-700">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="flex-1 mx-4 bg-slate-900 rounded px-3 py-1 text-xs text-slate-400">
                  reddride.com/dashboard
                </div>
              </div>

              {/* Dashboard Content */}
              <div className="p-8 bg-gradient-to-br from-slate-900 to-slate-950">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-1">Dashboard</h3>
                    <p className="text-slate-400">Manage your Reddit posts</p>
                  </div>
                  <button className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium">
                    + New Post
                  </button>
                </div>

                {/* Feature Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                  {['Spy Mode', 'Speed Alerts', 'Viral Optimizer', 'Optimal Times', 'Analytics', 'Comments'].map((tab, i) => (
                    <div
                      key={i}
                      className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium ${
                        i === 0 ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {tab}
                    </div>
                  ))}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Total Posts', value: '247' },
                    { label: 'Total Upvotes', value: '12.4K' },
                    { label: 'Comments', value: '3.2K' },
                    { label: 'Engagement', value: '94%' }
                  ].map((stat, i) => (
                    <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                      <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                      <div className="text-xs text-slate-400">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Content Area */}
                <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6 min-h-[200px]">
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="text-4xl mb-3">📊</div>
                      <p className="text-slate-400">Your posts and analytics appear here</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Everything You Need
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Powerful features to help you dominate Reddit marketing and grow your brand
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Link
                key={index}
                href={feature.href}
                className={`group p-8 rounded-2xl border-2 bg-gradient-to-br ${feature.color} transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: isVisible ? 'fadeInUp 0.6s ease-out forwards' : 'none',
                  opacity: isVisible ? 1 : 0
                }}
              >
                <div className="text-5xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {feature.description}
                </p>
                <div className="mt-4 text-slate-900 font-medium flex items-center gap-2 group-hover:gap-3 transition-all">
                  Learn more
                  <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Showcase Sections */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          {/* Spy Mode Feature */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <div className="inline-block px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full text-sm font-medium mb-4">
                SPY MODE
              </div>
              <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Track Competitors & Steal Their Secrets
              </h3>
              <p className="text-lg text-slate-600 mb-6">
                Monitor your competitors' Reddit activity in real-time. Get instant alerts when they post,
                analyze their strategies, and stay one step ahead in your niche.
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-slate-700">Real-time competitor monitoring</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-slate-700">Instant sound alerts for new posts</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-slate-700">Performance analytics and insights</span>
                </li>
              </ul>
              <Link href="/dashboard/spy-mode" className="text-blue-600 font-medium hover:text-blue-700">
                Explore Spy Mode →
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 blur-3xl"></div>
              <div className="relative bg-slate-900 rounded-xl shadow-2xl p-6 border border-slate-700">
                <div className="text-cyan-400 text-2xl font-bold mb-4">SPY MODE</div>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-slate-700 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-3 bg-slate-700 rounded w-24 mb-1"></div>
                          <div className="h-2 bg-slate-700 rounded w-16"></div>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-700 rounded w-full mb-1"></div>
                      <div className="h-2 bg-slate-700 rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Analytics Feature */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-pink-400/20 blur-3xl"></div>
              <div className="relative bg-white rounded-xl shadow-2xl p-6 border border-slate-200">
                <div className="text-slate-900 text-xl font-bold mb-4">Analytics Dashboard</div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: 'Posts', value: '247' },
                    { label: 'Upvotes', value: '12.4K' },
                    { label: 'Engagement', value: '94%' }
                  ].map((stat, i) => (
                    <div key={i} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                      <div className="text-xs text-slate-600">{stat.label}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-end justify-between h-32">
                    {[40, 65, 45, 80, 60, 90, 75].map((height, i) => (
                      <div
                        key={i}
                        className="bg-gradient-to-t from-blue-500 to-purple-500 rounded-t w-8"
                        style={{ height: `${height}%` }}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">
                ANALYTICS
              </div>
              <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Track Performance & Optimize
              </h3>
              <p className="text-lg text-slate-600 mb-6">
                Get detailed insights into your Reddit performance. Track upvotes, comments, engagement rates,
                and identify your top-performing content across all subreddits.
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-slate-700">Real-time performance metrics</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-slate-700">Subreddit-specific analytics</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-slate-700">Export data to CSV</span>
                </li>
              </ul>
              <Link href="/dashboard/analytics" className="text-purple-600 font-medium hover:text-purple-700">
                View Analytics →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Account Warm-up Feature */}
      <section className="py-20 px-6 bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium mb-4">
                🔥 ACCOUNT WARMUP
              </div>
              <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Account Warm-up System
              </h3>
              <p className="text-lg text-slate-600 mb-6">
                Build authentic credibility before you start marketing. Our intelligent warm-up system gradually increases your Reddit account's activity to establish trust and avoid spam filters, ensuring your marketing efforts won't be blocked.
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-slate-700">Gradual karma building through authentic engagement</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-slate-700">Avoid spam detection and account bans</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-slate-700">AI-powered natural behavior simulation</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-slate-700">Establish trust before marketing campaigns</span>
                </li>
              </ul>
              <Link href="/dashboard" className="text-orange-600 font-medium hover:text-orange-700">
                Start Warming Up →
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-pink-400/20 blur-3xl"></div>
              <div className="relative rounded-xl shadow-2xl overflow-hidden border border-orange-200">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-auto"
                >
                  <source src="/warmup-animation.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Real Use Cases */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Real Use Cases
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              See how entrepreneurs and businesses are using our platform to drive authentic growth on Reddit
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Use Case 1: Indie Developer */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center text-3xl mb-4">
                💻
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Indie Developer Launch</h3>
              <p className="text-blue-600 font-medium mb-6">Mobile App Release</p>

              <div className="bg-white rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-slate-900 mb-3">Strategy</h4>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Scheduled "Show HN" style posts in r/SideProject, r/webdev, and r/reactnative.
                  Used AI content generation to create authentic launch stories. Auto-replies engage
                  with feedback and answer technical questions.
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-slate-900 mb-3">Results</h4>
                <p className="text-sm">
                  <span className="text-blue-600 font-bold">500+ beta signups</span>
                  <span className="text-slate-600"> from developers genuinely interested in the product,
                  with zero spam flags.</span>
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  r/SideProject
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  r/webdev
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  r/reactnative
                </span>
              </div>
            </div>

            {/* Use Case 2: E-commerce Brand */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-100 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-purple-500 rounded-xl flex items-center justify-center text-3xl mb-4">
                🛒
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">E-commerce Growth</h3>
              <p className="text-purple-600 font-medium mb-6">Sustainable Products Brand</p>

              <div className="bg-white rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-slate-900 mb-3">Strategy</h4>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Published value-first content like "5 ways to reduce plastic waste" across
                  r/ZeroWaste, r/sustainability, and r/BuyItForLife. Spy Mode tracks competitor
                  posts. Auto-replies naturally mention products when relevant.
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-slate-900 mb-3">Results</h4>
                <p className="text-sm">
                  <span className="text-purple-600 font-bold">2,500+ store visits</span>
                  <span className="text-slate-600"> and 18% conversion rate from Reddit traffic,
                  building authentic brand trust.</span>
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  r/ZeroWaste
                </span>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  r/sustainability
                </span>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  r/BuyItForLife
                </span>
              </div>
            </div>

            {/* Use Case 3: Content Creator */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-100 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-green-500 rounded-xl flex items-center justify-center text-3xl mb-4">
                🎥
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Content Creator</h3>
              <p className="text-green-600 font-medium mb-6">YouTube Tech Reviewer</p>

              <div className="bg-white rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-slate-900 mb-3">Strategy</h4>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Automated posting of video summaries to r/technology, r/gadgets, and niche tech
                  subreddits. Optimal timing ensures posts go live when subreddits are most active.
                  Analytics track which content resonates best.
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-slate-900 mb-3">Results</h4>
                <p className="text-sm">
                  <span className="text-green-600 font-bold">50K+ video views</span>
                  <span className="text-slate-600"> per month from Reddit, with 3,000+ new subscribers
                  and strong community engagement.</span>
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  r/technology
                </span>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  r/gadgets
                </span>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  r/Android
                </span>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              href="/signup"
              className="inline-block px-8 py-4 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all hover:shadow-xl hover:shadow-slate-900/20"
            >
              Start Your Success Story →
            </Link>
          </div>
        </div>
      </section>

      {/* Competitor Comparison */}
      <section className="py-20 px-6 bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-5xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <div className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
              WHY REDRIDE
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              RedRide vs The Competition
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              See how RedRide stacks up against Scaloom and why marketers choose us
            </p>
          </div>

          {/* Comparison Table */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden hover:shadow-2xl transition-shadow">
            {/* Table Header */}
            <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200">
              <div className="p-4 md:p-6 font-semibold text-slate-700">Feature</div>
              <div className="p-4 md:p-6 font-bold text-slate-900 bg-gradient-to-r from-blue-50 to-purple-50 text-center">
                🤖 RedRide
              </div>
              <div className="p-4 md:p-6 font-semibold text-slate-500 text-center">Scaloom</div>
            </div>

            {/* Feature Rows */}
            {[
              { feature: 'Spy Mode (Competitor Monitoring)', redride: true, scaloom: false, highlight: true },
              { feature: 'Viral Optimizer', redride: true, scaloom: false, highlight: true },
              { feature: 'Speed Alerts', redride: true, scaloom: false, highlight: true },
              { feature: 'Real-time Analytics Dashboard', redride: true, scaloom: 'partial' },
              { feature: 'Account Warmup', redride: true, scaloom: true },
              { feature: 'Multi-Subreddit Posting', redride: true, scaloom: true },
              { feature: 'AI Content Generation', redride: true, scaloom: true },
              { feature: 'Auto-Replies', redride: true, scaloom: true },
              { feature: 'Subreddit Discovery', redride: true, scaloom: true },
              { feature: 'Optimal Timing', redride: true, scaloom: true },
            ].map((row, index) => (
              <div
                key={index}
                className={`grid grid-cols-3 border-b border-slate-100 last:border-b-0 ${
                  row.highlight
                    ? 'bg-gradient-to-r from-cyan-50 to-blue-50 border-l-4 border-l-cyan-500'
                    : index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                }`}
              >
                <div className={`p-4 md:p-5 text-slate-700 ${row.highlight ? 'font-semibold' : ''}`}>
                  {row.feature}
                  {row.highlight && <span className="ml-2 text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full">Exclusive</span>}
                </div>
                <div className="p-4 md:p-5 text-center">
                  {row.redride && <span className="text-green-500 text-xl">✓</span>}
                </div>
                <div className="p-4 md:p-5 text-center">
                  {row.scaloom === true && <span className="text-green-500 text-xl">✓</span>}
                  {row.scaloom === false && <span className="text-red-400 text-xl">✗</span>}
                  {row.scaloom === 'partial' && <span className="text-yellow-500 text-sm">CSV Only</span>}
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-10">
            <Link
              href="/signup"
              className="inline-block px-8 py-4 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all hover:shadow-xl hover:shadow-slate-900/20 hover:-translate-y-0.5"
            >
              Start Free with RedRide →
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              How it works
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Get started in minutes with our simple four-step process
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-6">
                1
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Install the Extension</h3>
              <p className="text-slate-600">
                Add ReddRide to your browser in one click
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Connect Reddit</h3>
              <p className="text-slate-600">
                Securely link your Reddit account
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Set Your Preferences</h3>
              <p className="text-slate-600">
                Choose subreddits and engagement style
              </p>
            </div>

            {/* Step 4 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-6">
                4
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Watch It Work</h3>
              <p className="text-slate-600">
                ReddRide handles the rest automatically
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            Ready to Grow Your Reddit Presence?
          </h2>
          <p className="text-xl text-slate-600 mb-10">
            Join our alpha program and get lifetime free access as one of the first 10 users
          </p>
          <Link
            href="/signup"
            className="inline-block px-10 py-5 bg-slate-900 text-white text-lg rounded-xl font-semibold hover:bg-slate-800 transition-all hover:shadow-xl hover:shadow-slate-900/20 hover:-translate-y-0.5"
          >
            Get Started →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-3xl">🤖</span>
            <span className="text-xl font-bold">RedRide</span>
          </div>
          <p className="text-slate-400 mb-6">
            AI-Powered Reddit Marketing Automation
          </p>
          <p className="text-sm text-slate-500">
            Powered by Next.js, Gemini AI, and PostgreSQL
          </p>
        </div>
      </footer>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}

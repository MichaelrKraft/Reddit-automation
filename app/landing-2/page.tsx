'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import FounderBanner from '@/components/FounderBanner';
import TextType from '@/components/TextType';
import GradientText from '@/components/GradientText';
import ShinyText from '@/components/ShinyText';
import ScrollReveal from '@/components/ScrollReveal';
import dynamic from 'next/dynamic';

const Antigravity = dynamic(() => import('@/components/Antigravity'), { ssr: false });

interface UserStats {
  isLoggedIn: boolean
  tier?: string
  signupNumber?: number
  hasLifetimeDeal?: boolean
  founderSpotsRemaining: number
  isFounder?: boolean
  canPurchaseLifetime?: boolean
}

interface PricingInfo {
  currentTier: {
    tier: number
    maxCount: number
    price: number
    label: string
    discount: string
    spotsRemaining: number
    currentCount: number
    isSoldOut: boolean
  }
  totalSold: number
}

export default function LandingPage2() {
  const [isVisible, setIsVisible] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [pricingInfo, setPricingInfo] = useState<PricingInfo | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    fetchUserStats();
    fetchPricingInfo();
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

  async function fetchPricingInfo() {
    try {
      const response = await fetch('/api/pricing/current');
      const data = await response.json();
      setPricingInfo(data);
    } catch (error) {
      console.error('Failed to fetch pricing info:', error);
    }
  }

  const features = [
    {
      title: 'Smart Scheduling',
      description: 'Set it once, post perfectly timed content for weeks. Schedule to multiple subreddits at peak engagement hours.',
      href: '/dashboard/new-post',
      color: 'from-blue-500/10 to-cyan-500/10 border-blue-500/20 hover:border-blue-500/40'
    },
    {
      title: 'AI Content That Converts',
      description: 'Generate 50+ post variations in minutes, not hours. Each one tuned for maximum engagement in your target subreddits.',
      href: '/dashboard/viral',
      color: 'from-purple-500/10 to-pink-500/10 border-purple-500/20 hover:border-purple-500/40'
    },
    {
      title: 'Subreddit Intelligence',
      description: 'Discover your perfect audience instantly. AI finds communities where your ideal customers already hang out.',
      href: '/dashboard/discover',
      color: 'from-green-500/10 to-emerald-500/10 border-green-500/20 hover:border-green-500/40'
    },
    {
      title: 'SEO Traffic Finder',
      description: 'Find high-ranking Google Reddit threads for any keyword and inject your brand into conversations that already get Google traffic.',
      href: '/dashboard/seo-finder',
      color: 'from-rose-500/10 to-pink-500/10 border-rose-500/20 hover:border-rose-500/40'
    },
    {
      title: 'Business Analyzer',
      description: 'Paste any URL. Get a complete Reddit strategy: target audience, pain points, and the exact subreddits to conquer.',
      href: '/dashboard/analyze',
      color: 'from-sky-500/10 to-blue-500/10 border-sky-500/20 hover:border-sky-500/40'
    },
    {
      title: 'Visual Post Calendar',
      description: 'See your entire content strategy at a glance. Drag-and-drop to reschedule. Never miss a posting window.',
      href: '/dashboard/calendar',
      color: 'from-teal-500/10 to-emerald-500/10 border-teal-500/20 hover:border-teal-500/40'
    },
    {
      title: 'Comment Command Center',
      description: 'Every comment is a lead. Track, respond, and convert discussions into customers from one dashboard.',
      href: '/dashboard/comments',
      color: 'from-lime-500/10 to-green-500/10 border-lime-500/20 hover:border-lime-500/40'
    }
  ];

  // Calculate spots remaining for display
  const spotsRemaining = userStats?.founderSpotsRemaining ?? 10;

  // Format price for display (cents to dollars)
  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(0)}`;
  const currentPrice = pricingInfo?.currentTier?.price ?? 2900;
  const currentLabel = pricingInfo?.currentTier?.label ?? 'Founding Alpha';
  const currentDiscount = pricingInfo?.currentTier?.discount ?? '90% off';
  const tierSpotsRemaining = pricingInfo?.currentTier?.spotsRemaining ?? 10;
  const isSoldOut = pricingInfo?.currentTier?.isSoldOut ?? false;

  return (
    <ScrollReveal>
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 pt-[112px]">
      {/* Alpha Banner - Dynamic based on tiered pricing */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-500 to-red-500 text-white text-center py-2 px-4">
        <span className="font-semibold">
          {userStats?.hasLifetimeDeal ? (
            <>You have lifetime access! Thank you for believing in us!</>
          ) : isSoldOut ? (
            <>Alpha Launch: Get lifetime access for {formatPrice(currentPrice)}!</>
          ) : (
            <>Only {tierSpotsRemaining} spot{tierSpotsRemaining !== 1 ? 's' : ''} left at {formatPrice(currentPrice)} ({currentDiscount}) - Join 500+ marketers already using ReddRide</>
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
      <nav className="fixed top-11 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between h-[72px]">
          <div className="flex items-center overflow-visible">
            <img src="/reddride-logo.png" alt="ReddRide - The Reddit AI Automation Platform" className="h-16 sm:h-[101px] -my-2" />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/pricing"
              className="px-6 py-2.5 text-slate-700 font-medium hover:text-slate-900 transition-all"
            >
              Pricing
            </Link>
            {userStats?.isLoggedIn ? (
              <Link
                href="/dashboard"
                className="group relative px-6 py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-all hover:shadow-lg border-2 border-red-500/70 hover:shadow-[0_0_20px_rgba(239,68,68,0.7)] overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></span>
                <span className="relative">Dashboard</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="px-6 py-2.5 text-slate-700 font-medium hover:text-slate-900 transition-all"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="group relative px-6 py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-all hover:shadow-lg border-2 border-red-500/70 hover:shadow-[0_0_20px_rgba(239,68,68,0.7)] overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></span>
                  <span className="relative">Start Growing on Reddit</span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-200 px-4 py-4 space-y-3">
            <Link
              href="/pricing"
              className="block px-4 py-3 text-slate-700 font-medium hover:bg-slate-50 rounded-lg transition-all"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            {userStats?.isLoggedIn ? (
              <Link
                href="/dashboard"
                className="group relative block px-4 py-3 bg-slate-900 text-white rounded-lg font-medium text-center hover:bg-slate-800 transition-all border-2 border-red-500/70 overflow-hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></span>
                <span className="relative">Dashboard</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="block px-4 py-3 text-slate-700 font-medium hover:bg-slate-50 rounded-lg transition-all"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="group relative block px-4 py-3 bg-slate-900 text-white rounded-lg font-medium text-center hover:bg-slate-800 transition-all border-2 border-red-500/70 overflow-hidden"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></span>
                  <span className="relative">Start Growing on Reddit</span>
                </Link>
              </>
            )}
          </div>
        )}
      </nav>

      {/* Hero Section - UPGRADED */}
      <section className="pt-12 pb-20 px-6">
        <div className={`max-w-7xl mx-auto text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="inline-block mt-2 mb-2 px-4 py-2 bg-slate-900/5 border border-slate-900/10 rounded-full">
            <span className="text-sm font-medium text-slate-700">Save 10+ hours every week on Reddit marketing</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold text-slate-900 mb-6 leading-normal font-[family-name:var(--font-montserrat)]">
            <span className="block">
              <TextType
                text="Turn Reddit Into Your"
                typingSpeed={50}
                initialDelay={0}
                showCursor={false}
                loop={false}
              />
            </span>
            <span className="block">
              <TextType
                text="#1 "
                typingSpeed={50}
                initialDelay={1200}
                showCursor={false}
                loop={false}
                className="text-red-500"
              />
              <TextType
                text="Customer Acquisition"
                typingSpeed={50}
                initialDelay={1300}
                showCursor={false}
                loop={false}
              />
            </span>
            <span className="block">
              <TextType
                text="Channel"
                typingSpeed={50}
                initialDelay={2200}
                showCursor={false}
                loop={false}
              />
              <TextType
                text="."
                typingSpeed={50}
                initialDelay={2500}
                showCursor={false}
                loop={false}
              />
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-red-500 mb-10 max-w-3xl mx-auto leading-relaxed">
            Get 10+ hours back every week while your Reddit presence grows automatically. No spam filters. No bans. Just real customers.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/sign-up"
              className="group relative px-8 py-4 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all hover:shadow-xl hover:-translate-y-0.5 border-2 border-red-500/70 hover:shadow-[0_0_20px_rgba(239,68,68,0.7)] overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></span>
              <span className="relative">Start Growing on Reddit Today</span>
            </Link>
            <a
              href="#features"
              className="group relative px-8 py-4 bg-white border-2 border-slate-200 text-slate-900 rounded-xl font-semibold hover:border-slate-300 transition-all hover:shadow-lg overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-200/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></span>
              <span className="relative">See How It Works</span>
            </a>
          </div>

          {/* Stats - UPGRADED with time savings focus */}
          <div className="mt-12 sm:mt-16 grid grid-cols-3 gap-4 sm:gap-8 max-w-2xl mx-auto">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900">10+ hrs</div>
              <div className="text-xs sm:text-sm text-slate-600 mt-1">Saved Weekly</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900">500+</div>
              <div className="text-xs sm:text-sm text-slate-600 mt-1">Active Marketers</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900">3x</div>
              <div className="text-xs sm:text-sm text-slate-600 mt-1">More Leads</div>
            </div>
          </div>
        </div>
      </section>

      {/* App Preview Section */}
      <section className="py-12 md:py-20 px-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="reveal-up text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
              <ShinyText speed={3}>
                Your Reddit Command Center
              </ShinyText>
            </h2>
            <p className="reveal-up text-xl text-slate-300 max-w-2xl mx-auto">
              Everything you need to dominate Reddit marketing in one powerful dashboard
            </p>
          </div>

          {/* Dashboard Mockup */}
          <div className="reveal-up relative">
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

              {/* Demo Video */}
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-auto"
                poster="/demo-poster.jpg"
              >
                <source src="/demo-video.mp4" type="video/mp4" />
                <div className="p-8 bg-gradient-to-br from-slate-900 to-slate-950 text-center">
                  <div className="text-4xl mb-3"></div>
                  <p className="text-slate-400">Your browser doesn't support this video format</p>
                </div>
              </video>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - UPGRADED with specific metrics */}
      <section id="features" className="py-12 md:py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="reveal-up text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Everything You Need to Win on Reddit
            </h2>
            <p className="reveal-up text-xl text-slate-600 max-w-2xl mx-auto">
              Stop wasting time on manual posting. Automate your Reddit growth and focus on what matters.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Link
                key={index}
                href={feature.href}
                className={`reveal-up group p-8 rounded-2xl border-2 bg-gradient-to-br ${feature.color} transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: isVisible ? 'fadeInUp 0.6s ease-out forwards' : 'none',
                  opacity: isVisible ? 1 : 0
                }}
              >
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
      <section className="py-12 md:py-20 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          {/* Spy Mode Feature */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center mb-12 md:mb-20">
            <div>
              <div className="reveal-up inline-block px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full text-sm font-medium mb-4">
                SPY MODE
              </div>
              <h3 className="reveal-up text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Know What Your Competitors Do Before They Do It
              </h3>
              <p className="reveal-up text-lg text-slate-600 mb-6">
                Get instant alerts when competitors post. See their highest-performing content. Copy what works and beat them to every trending conversation.
              </p>
              <ul className="reveal-up space-y-3 mb-6">
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-slate-700">Real-time alerts when competitors post</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-slate-700">See their top-performing strategies</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-slate-700">Steal their audience with better timing</span>
                </li>
              </ul>
              <Link href="/dashboard/spy-mode" className="reveal-up text-blue-600 font-medium hover:text-blue-700">
                Explore Spy Mode →
              </Link>
            </div>
            <div className="reveal-up relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 blur-3xl"></div>
              <div className="relative rounded-xl shadow-2xl overflow-hidden border border-slate-700">
                <img
                  src="/spymode-screenshot.png"
                  alt="Spy Mode - Track competitors and steal their secrets"
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>

          {/* Speed Alerts Feature - UPGRADED with specific metrics */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center mt-12 md:mt-20">
            <div>
              <div className="reveal-up inline-block px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium mb-4">
                SPEED ALERTS
              </div>
              <h3 className="reveal-up text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Catch Viral Posts Before They Peak
              </h3>
              <p className="reveal-up text-lg text-slate-600 mb-6">
                Get alerts when posts hit 100+ upvotes in their first hour. Jump into conversations while they're still hot and capture thousands of eyeballs.
              </p>
              <ul className="reveal-up space-y-3 mb-6">
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-slate-700">Instant alerts on viral momentum</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-slate-700">Get your brand in front of massive audiences</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-slate-700">Turn trending topics into traffic</span>
                </li>
              </ul>
              <Link href="/dashboard/speed-alerts" className="reveal-up text-orange-600 font-medium hover:text-orange-700">
                Configure Alerts →
              </Link>
            </div>
            <div className="reveal-up relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-red-400/20 blur-3xl"></div>
              <div className="relative rounded-xl shadow-2xl overflow-hidden border border-slate-200">
                <img
                  src="/instant-alerts.png"
                  alt="Speed Alerts - Never miss a viral moment"
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>

          {/* Viral AI Feature - UPGRADED */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center mt-12 md:mt-20">
            <div className="reveal-up order-2 md:order-1 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-pink-400/20 blur-3xl"></div>
              <div className="relative rounded-xl shadow-2xl overflow-hidden border border-slate-200">
                <img
                  src="/viral-screenshot.png"
                  alt="AI Viral Content Generator"
                  className="w-full h-auto"
                />
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="reveal-up inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">
                AI CONTENT ENGINE
              </div>
              <h3 className="reveal-up text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Generate 50+ Post Variations in Minutes
              </h3>
              <p className="reveal-up text-lg text-slate-600 mb-6">
                Our AI studied 5,000+ viral posts. It knows what works in each subreddit. Generate weeks of content in the time it takes to write one post manually.
              </p>
              <ul className="reveal-up space-y-3 mb-6">
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-slate-700">Content tuned for each community's vibe</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-slate-700">Save 5+ hours of writing every week</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-slate-700">10x more engagement on your posts</span>
                </li>
              </ul>
              <Link href="/dashboard/new-post" className="reveal-up text-purple-600 font-medium hover:text-purple-700">
                Generate Content →
              </Link>
            </div>
          </div>

          {/* Analytics Feature */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center mt-12 md:mt-20">
            <div>
              <div className="reveal-up inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">
                ANALYTICS
              </div>
              <h3 className="reveal-up text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Know Exactly What's Working
              </h3>
              <p className="reveal-up text-lg text-slate-600 mb-6">
                Stop guessing and start scaling. See which posts drive the most traffic, which subreddits
                love your content, and double down on what actually converts.
              </p>
              <ul className="reveal-up space-y-3 mb-6">
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-slate-700">Identify your highest-converting content</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-slate-700">Find your most profitable subreddits</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-slate-700">Optimize your strategy with data</span>
                </li>
              </ul>
              <Link href="/dashboard/analytics" className="reveal-up text-purple-600 font-medium hover:text-purple-700">
                View Analytics →
              </Link>
            </div>
            <div className="reveal-up relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-pink-400/20 blur-3xl"></div>
              <div className="relative rounded-xl shadow-2xl overflow-hidden border border-slate-200">
                <img
                  src="/analytics-screenshot.png"
                  alt="Analytics Dashboard - Track your Reddit performance"
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Account Warm-up Feature - UPGRADED with risk-prevention angle */}
      <section className="py-12 md:py-20 px-6 bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div>
              <div className="reveal-up inline-block px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium mb-4">
                DON'T GET BANNED
              </div>
              <h3 className="reveal-up text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Avoid the #1 Mistake That Gets 90% of Marketing Accounts Banned
              </h3>
              <p className="reveal-up text-lg text-slate-600 mb-6">
                Most Reddit marketing accounts get shadowbanned within weeks. Our 30-day guided warmup process builds authentic credibility so your marketing actually reaches people.
              </p>
              <ul className="reveal-up space-y-3 mb-6">
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-slate-700">30-day guided warmup process</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-slate-700">Build 500+ karma before posting</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-slate-700">AI simulates natural Reddit behavior</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-slate-700">Shadowban detection & alerts</span>
                </li>
              </ul>
              <Link href="/dashboard" className="reveal-up text-orange-600 font-medium hover:text-orange-700">
                Start Warming Up →
              </Link>
            </div>
            <div className="reveal-up relative">
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


      {/* Real Use Cases - UPGRADED with ROI outcomes */}
      <section className="py-12 md:py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="reveal-up text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Real Results From Real Marketers
            </h2>
            <p className="reveal-up text-xl text-slate-600 max-w-3xl mx-auto">
              See how businesses like yours are driving real revenue from Reddit
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Use Case 1: SaaS - UPGRADED */}
            <div className="reveal-up bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center text-3xl mb-4">
                💻
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">SaaS Founder</h3>
              <p className="text-blue-600 font-medium mb-6">B2B Software</p>

              <div className="bg-white rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-slate-900 mb-3">Before ReddRide</h4>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Spending 10+ hours/week manually posting. Getting 2-3 leads per month. Most posts ignored or removed.
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-slate-900 mb-3">After ReddRide</h4>
                <p className="text-sm">
                  <span className="text-blue-600 font-bold">3x more qualified leads</span>
                  <span className="text-slate-600"> with 2 hours/week. Posts optimized for each subreddit. Zero bans.</span>
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  r/SaaS
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  r/startups
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  r/Entrepreneur
                </span>
              </div>
            </div>

            {/* Use Case 2: E-commerce - UPGRADED */}
            <div className="reveal-up bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-100 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-purple-500 rounded-xl flex items-center justify-center text-3xl mb-4">
                🛒
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">E-commerce Brand</h3>
              <p className="text-purple-600 font-medium mb-6">DTC Products</p>

              <div className="bg-white rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-slate-900 mb-3">Before ReddRide</h4>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Paying $50+ per customer from Facebook ads. High ad spend, low margins.
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-slate-900 mb-3">After ReddRide</h4>
                <p className="text-sm">
                  <span className="text-purple-600 font-bold">40% better conversion rate</span>
                  <span className="text-slate-600"> than paid ads. Reddit traffic converts because it's warm and targeted.</span>
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  r/BuyItForLife
                </span>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  r/Deals
                </span>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  Niche subs
                </span>
              </div>
            </div>

            {/* Use Case 3: Content Creator */}
            <div className="reveal-up bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-100 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-green-500 rounded-xl flex items-center justify-center text-3xl mb-4">
                🎥
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Content Creator</h3>
              <p className="text-green-600 font-medium mb-6">YouTube Channel</p>

              <div className="bg-white rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-slate-900 mb-3">Before ReddRide</h4>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Growing subscribers slowly. YouTube algorithm not showing videos to new audiences.
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-slate-900 mb-3">After ReddRide</h4>
                <p className="text-sm">
                  <span className="text-green-600 font-bold">50K+ video views/month</span>
                  <span className="text-slate-600"> from Reddit. 3,000+ new subscribers. Strong community engagement.</span>
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
              href="/sign-up"
              className="group relative inline-block px-8 py-4 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all hover:shadow-xl border-2 border-red-500/70 hover:shadow-[0_0_20px_rgba(239,68,68,0.7)] overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></span>
              <span className="relative">Join 500+ Marketers Growing on Reddit</span>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works - SIMPLIFIED to 3 steps */}
      <section className="py-12 md:py-20 px-6 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="reveal-up text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Start Growing in 3 Simple Steps
            </h2>
            <p className="reveal-up text-xl text-slate-600 max-w-2xl mx-auto">
              Get set up in under 5 minutes. No technical skills required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="reveal-up text-center">
              <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center text-3xl font-bold text-white mx-auto mb-6 border-2 border-red-500/70 hover:shadow-[0_0_20px_rgba(239,68,68,0.7)]">
                1
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Connect</h3>
              <p className="text-slate-600">
                Link your Reddit account in 2 minutes with secure OAuth. Your credentials are never stored.
              </p>
            </div>

            {/* Step 2 */}
            <div className="reveal-up text-center">
              <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center text-3xl font-bold text-white mx-auto mb-6 border-2 border-red-500/70 hover:shadow-[0_0_20px_rgba(239,68,68,0.7)]">
                2
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Set Your Goals</h3>
              <p className="text-slate-600">
                Tell us your niche and target subreddits. AI suggests the best communities for your business.
              </p>
            </div>

            {/* Step 3 */}
            <div className="reveal-up text-center">
              <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center text-3xl font-bold text-white mx-auto mb-6 border-2 border-red-500/70 hover:shadow-[0_0_20px_rgba(239,68,68,0.7)]">
                3
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Watch It Grow</h3>
              <p className="text-slate-600">
                ReddRide handles posting, timing, and engagement. You track results and watch your audience grow.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 md:py-20 px-6 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="reveal-up text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="reveal-up text-xl text-slate-600">
              Everything you need to know about ReddRide
            </p>
          </div>

          <div className="reveal-up space-y-4">
            {[
              {
                question: "How much time will I actually save?",
                answer: "Most users save 10+ hours per week. Instead of manually posting, researching subreddits, and monitoring conversations, ReddRide automates all of it. You can set up a week's worth of content in 30 minutes and let the AI handle the rest."
              },
              {
                question: "Will my account get banned?",
                answer: "Our warmup system is specifically designed to prevent bans. We mimic natural Reddit behavior, space out posts intelligently, and build authentic karma before marketing. Users following our warmup process have an extremely high success rate."
              },
              {
                question: "How long until I see results?",
                answer: "It depends on your starting point. If you have an established account, you can start seeing traffic within days. New accounts go through our 2-4 week warmup process first to build credibility, then start generating consistent results."
              },
              {
                question: "What kind of ROI can I expect?",
                answer: "Reddit traffic converts exceptionally well because users are actively seeking solutions. Our users typically see 3x more qualified leads compared to cold outreach, and 40%+ better conversion rates than paid social ads."
              },
              {
                question: "Can I use my existing Reddit account?",
                answer: "Absolutely! You can connect existing accounts or create new ones. For established accounts with good karma, you can skip the warmup phase and start posting immediately."
              },
              {
                question: "Is this against Reddit's rules?",
                answer: "We focus on creating genuine value for Reddit communities. Our AI generates helpful, contextual content—not spam. We follow Reddit's guidelines and help you build authentic engagement, which is exactly what Reddit rewards."
              },
              {
                question: "What if I need help getting started?",
                answer: "We provide full onboarding support. Our dashboard walks you through setup step-by-step, and our team is available to help you optimize your strategy for maximum results."
              },
              {
                question: "Is there a free trial?",
                answer: "Yes! Sign up free to explore the dashboard and see how ReddRide works. You can upgrade to lifetime access whenever you're ready to unlock all features."
              },
            ].map((faq, index) => (
              <details
                key={index}
                className="group bg-white rounded-xl border border-slate-200 overflow-hidden"
              >
                <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 transition-colors">
                  <span className="font-semibold text-slate-900 text-left pr-4">{faq.question}</span>
                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 group-open:bg-slate-900 transition-colors">
                    <svg
                      className="w-4 h-4 text-slate-600 group-open:text-white group-open:rotate-180 transition-transform duration-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <div className="px-5 pb-5 text-slate-600 leading-relaxed">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - UPGRADED with urgency */}
      <section className="py-12 md:py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="reveal-up text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            Stop Wasting Time. Start Growing on Reddit.
          </h2>
          <p className="reveal-up text-xl text-slate-600 mb-4">
            {isSoldOut ? (
              <>Get lifetime access for {formatPrice(currentPrice)}</>
            ) : (
              <>Only {tierSpotsRemaining} spot{tierSpotsRemaining !== 1 ? 's' : ''} left at <span className="text-green-600 font-bold">{formatPrice(currentPrice)}</span> ({currentDiscount})</>
            )}
          </p>
          <p className="reveal-up text-lg text-slate-700 mb-4 font-medium">
            Join 500+ marketers already using ReddRide to grow their business
          </p>
          <p className="reveal-up text-sm text-slate-500 mb-10">
            One-time payment. Lifetime access. Save 10+ hours every week.
          </p>
          <Link
            href="/sign-up"
            className="reveal-up group relative inline-block px-10 py-5 bg-slate-900 text-white text-lg rounded-xl font-semibold hover:bg-slate-800 transition-all hover:shadow-xl hover:-translate-y-0.5 border-2 border-red-500/70 hover:shadow-[0_0_20px_rgba(239,68,68,0.7)] overflow-hidden"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></span>
            <span className="relative">Start Growing on Reddit Today</span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-slate-900 text-white relative">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/reddride-logo-dark.png" alt="ReddRide" className="h-24" />
          </div>
          <p className="text-slate-400 mb-6">
            AI-Powered Reddit Marketing Automation
          </p>
          <p className="text-sm text-slate-500">
            Powered by Next.js, Gemini AI, and PostgreSQL
          </p>
        </div>
        {/* Elephant icon in lower left */}
        <img
          src="/red-elephant-icon.png"
          alt=""
          className="absolute bottom-16 left-6 h-32 w-32 object-contain"
        />
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
    </ScrollReveal>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
  allTiers: Array<{
    tier: number
    maxCount: number
    price: number
    label: string
    discount: string
  }>
  fullPrice: number
  totalSold: number
}

export default function PricingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pricingInfo, setPricingInfo] = useState<PricingInfo | null>(null);

  useEffect(() => {
    async function fetchPricingInfo() {
      try {
        const response = await fetch('/api/pricing/current');
        const data = await response.json();
        setPricingInfo(data);
      } catch (error) {
        console.error('Failed to fetch pricing info:', error);
      }
    }
    fetchPricingInfo();
  }, []);

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(0)}`;

  const tiers = [
    {
      name: 'Individual',
      price: '$39',
      period: '/month',
      description: 'Perfect for solo marketers and indie makers',
      features: [
        '1 Reddit account',
        'Post scheduling',
        'AI content generation',
        'Subreddit discovery',
        'Basic analytics',
        'Optimal timing',
        'Viral Optimizer',
        'Auto-replies',
      ],
      cta: 'Get Started',
      href: '/signup',
      highlighted: false,
    },
    {
      name: 'Premier',
      price: '$79',
      period: '/month',
      description: 'For growing teams and agencies',
      features: [
        'Everything in Individual',
        '5 Reddit accounts',
        'Spy Mode',
        'Speed Alerts',
        'Priority support',
      ],
      cta: 'Get Started',
      href: '/signup',
      highlighted: true,
      badge: 'Most Popular',
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'For large organizations with custom needs',
      features: [
        'Everything in Premier',
        'Unlimited accounts',
        'Custom integrations',
        'Dedicated account manager',
        'SLA guarantees',
        'White-label options',
      ],
      cta: 'Contact Us',
      href: 'mailto:hello@reddride.com',
      highlighted: false,
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between h-[72px]">
          <Link href="/" className="flex items-center overflow-visible">
            <img src="/reddride-logo.png" alt="ReddRide" className="h-16 sm:h-[101px] -my-2" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/sign-in"
              className="px-6 py-2.5 text-slate-700 font-medium hover:text-slate-900 transition-all"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="px-6 py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-all hover:shadow-lg border-2 border-red-500/70 hover:shadow-[0_0_20px_rgba(239,68,68,0.7)]"
            >
              Get Started →
            </Link>
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
              href="/sign-in"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-4 py-3 text-slate-700 font-medium hover:bg-slate-50 rounded-lg transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-4 py-3 bg-slate-900 text-white rounded-lg font-medium text-center hover:bg-slate-800 transition-all border-2 border-red-500/70"
            >
              Get Started →
            </Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-8 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Choose the plan that fits your Reddit marketing needs. No hidden fees, cancel anytime.
          </p>
        </div>
      </section>

      {/* Lifetime Deal Banner */}
      <section className="pb-12 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 shadow-lg text-white relative overflow-hidden border border-slate-700">
            {/* Red Elephant Logo - positioned on right */}
            <img
              src="/red-elephant-flying.png"
              alt=""
              className="absolute right-24 bottom-20 h-32 w-auto opacity-80 hidden md:block"
            />

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-sm font-medium">
                  Limited Time
                </span>
                <span className="bg-slate-700 text-slate-300 px-3 py-1 rounded-full text-sm font-medium">
                  {pricingInfo?.currentTier?.label || 'Founding Alpha'}
                </span>
              </div>

              <h2 className="text-2xl md:text-3xl font-bold mb-3">
                Lifetime Access Deal
              </h2>

              <p className="text-slate-300 text-base mb-5 max-w-xl">
                Get lifetime access to ReddRide for a one-time payment. Price increases as spots fill up.
              </p>

              <div className="flex flex-wrap items-center gap-5 mb-5">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white">
                      {formatPrice(pricingInfo?.currentTier?.price || 2900)}
                    </span>
                    <span className="text-xl text-slate-500 line-through">
                      {formatPrice(pricingInfo?.fullPrice || 29900)}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm mt-1">
                    One-time • {pricingInfo?.currentTier?.discount || '90% off'}
                  </p>
                </div>

                <div className="bg-slate-700/50 rounded-lg px-4 py-3">
                  <div className="text-2xl font-bold text-red-400">
                    {pricingInfo?.currentTier?.spotsRemaining ?? 10}
                  </div>
                  <div className="text-xs text-slate-400">spots left</div>
                </div>
              </div>

              {/* Tier Progress */}
              <div className="mb-5">
                <div className="text-xs text-slate-500 mb-2">Pricing tiers:</div>
                <div className="flex flex-wrap gap-1.5">
                  {(pricingInfo?.allTiers || []).map((tier) => (
                    <span
                      key={tier.tier}
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        tier.tier === pricingInfo?.currentTier?.tier
                          ? 'bg-red-500 text-white'
                          : tier.tier < (pricingInfo?.currentTier?.tier || 1)
                          ? 'bg-slate-700 text-slate-500 line-through'
                          : 'bg-slate-700/50 text-slate-500'
                      }`}
                    >
                      {formatPrice(tier.price)}
                    </span>
                  ))}
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-700/50 text-slate-500">
                    {formatPrice(pricingInfo?.fullPrice || 29900)}
                  </span>
                </div>
              </div>

              <Link
                href="/sign-up"
                className="group relative inline-block px-6 py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-all overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></span>
                <span className="relative">Get Lifetime Access →</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="text-center mb-8">
        <p className="text-slate-500">Or choose a monthly subscription:</p>
      </div>

      {/* Pricing Cards */}
      <section className="pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {tiers.map((tier, index) => (
              <div
                key={index}
                className={`relative rounded-2xl p-6 sm:p-8 ${
                  tier.highlighted
                    ? 'bg-slate-900 text-white shadow-2xl md:scale-105 border-2 border-red-500/70'
                    : 'bg-white border-2 border-slate-200 shadow-lg'
                }`}
              >
                {tier.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-semibold px-4 py-1 rounded-full">
                      {tier.badge}
                    </span>
                  </div>
                )}

                <div className="text-center mb-8">
                  <h3 className={`text-2xl font-bold mb-2 ${tier.highlighted ? 'text-white' : 'text-slate-900'}`}>
                    {tier.name}
                  </h3>
                  <p className={`text-sm mb-4 ${tier.highlighted ? 'text-slate-300' : 'text-slate-600'}`}>
                    {tier.description}
                  </p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className={`text-5xl font-bold ${tier.highlighted ? 'text-white' : 'text-slate-900'}`}>
                      {tier.price}
                    </span>
                    <span className={tier.highlighted ? 'text-slate-300' : 'text-slate-600'}>
                      {tier.period}
                    </span>
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  {tier.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <span className={`text-lg ${tier.highlighted ? 'text-green-400' : 'text-green-500'}`}>✓</span>
                      <span className={tier.highlighted ? 'text-slate-200' : 'text-slate-700'}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={tier.href}
                  className={`group relative block w-full py-3 px-6 rounded-xl font-semibold text-center transition-all overflow-hidden ${
                    tier.highlighted
                      ? 'bg-white text-slate-900 hover:bg-slate-100'
                      : 'bg-slate-900 text-white hover:bg-slate-800 border-2 border-red-500/70 hover:shadow-[0_0_20px_rgba(239,68,68,0.7)]'
                  }`}
                >
                  <span className={`absolute inset-0 bg-gradient-to-r from-transparent ${tier.highlighted ? 'via-slate-200/50' : 'via-white/30'} to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out`}></span>
                  <span className="relative">{tier.cta}</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Can I switch plans anytime?
              </h3>
              <p className="text-slate-600">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate your billing.
              </p>
            </div>

            <div className="border-b border-slate-200 pb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-slate-600">
                We accept all major credit cards (Visa, Mastercard, American Express) through our secure Stripe payment processor.
              </p>
            </div>

            <div className="border-b border-slate-200 pb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Is there a free trial?
              </h3>
              <p className="text-slate-600">
                We're currently in alpha and offering free access to early users. Sign up now to lock in special founder pricing!
              </p>
            </div>

            <div className="pb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                What's included in Priority Support?
              </h3>
              <p className="text-slate-600">
                Premier and Enterprise plans include priority email support with faster response times and direct access to our team.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Dominate Reddit?
          </h2>
          <p className="text-xl text-slate-300 mb-10">
            Join thousands of marketers using ReddRide to grow their presence on Reddit.
          </p>
          <Link
            href="/sign-up"
            className="inline-block px-10 py-5 bg-white text-slate-900 text-lg rounded-xl font-semibold hover:bg-slate-100 transition-all hover:shadow-xl"
          >
            Start Your Free Trial →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-slate-900 text-white relative">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/reddride-logo-dark.png" alt="ReddRide" className="h-12" />
          </div>
          <p className="text-slate-400 mb-6">
            AI-Powered Reddit Marketing Automation
          </p>
          <p className="text-sm text-slate-500">
            Powered by Next.js, Gemini AI, and PostgreSQL
          </p>
        </div>
        <img
          src="/red-elephant-icon.png"
          alt=""
          className="absolute bottom-16 left-6 h-32 w-32 object-contain"
        />
      </footer>
    </main>
  );
}

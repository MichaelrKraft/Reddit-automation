'use client';

import Link from 'next/link';

export default function PricingPage() {
  const tiers = [
    {
      name: 'Individual',
      price: '$29',
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
      price: '$67',
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
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between h-[72px]">
          <Link href="/" className="flex items-center overflow-visible">
            <img src="/reddride-logo.png" alt="ReddRide" className="h-[101px] -my-2" />
          </Link>
          <div className="flex items-center gap-3">
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
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Choose the plan that fits your Reddit marketing needs. No hidden fees, cancel anytime.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {tiers.map((tier, index) => (
              <div
                key={index}
                className={`relative rounded-2xl p-8 ${
                  tier.highlighted
                    ? 'bg-slate-900 text-white shadow-2xl scale-105 border-2 border-red-500/70'
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
                  className={`block w-full py-3 px-6 rounded-xl font-semibold text-center transition-all ${
                    tier.highlighted
                      ? 'bg-white text-slate-900 hover:bg-slate-100'
                      : 'bg-slate-900 text-white hover:bg-slate-800 border-2 border-red-500/70 hover:shadow-[0_0_20px_rgba(239,68,68,0.7)]'
                  }`}
                >
                  {tier.cta}
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

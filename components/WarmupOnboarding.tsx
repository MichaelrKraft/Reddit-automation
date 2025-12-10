'use client'

interface WarmupOnboardingProps {
  onStartWarmup: () => void
}

export default function WarmupOnboarding({ onStartWarmup }: WarmupOnboardingProps) {
  const phases = [
    {
      number: 1,
      title: 'Upvotes',
      duration: 'Days 1-3',
      description: 'Build initial trust by upvoting quality content',
      color: 'from-blue-500 to-blue-600',
    },
    {
      number: 2,
      title: 'Comments',
      duration: 'Days 4-7',
      description: 'Start engaging with thoughtful comments',
      color: 'from-purple-500 to-purple-600',
    },
    {
      number: 3,
      title: 'Posts',
      duration: 'Days 8-14',
      description: 'Create original posts in safe communities',
      color: 'from-indigo-500 to-indigo-600',
    },
    {
      number: 4,
      title: 'Mixed',
      duration: 'Days 15-30',
      description: 'Full engagement with all activity types',
      color: 'from-pink-500 to-pink-600',
    },
  ]

  const benefits = [
    'Upvotes authentic content in safe subreddits',
    'Posts thoughtful comments that build karma',
    'Creates original posts once trust is established',
    'Randomizes timing to appear natural',
    'Avoids shadowbans and spam filters',
  ]

  return (
    <div className="feature-card rounded-lg p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-3">Account Warmup</h2>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Build authentic Reddit credibility before promoting your business. Our AI gradually establishes trust to bypass spam filters and avoid shadowbans.
        </p>
      </div>

      {/* Phase Timeline */}
      <div className="mb-10">
        <h3 className="text-lg font-semibold text-white mb-6 text-center">The 30-Day Warmup Journey</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {phases.map((phase, index) => (
            <div key={phase.number} className="relative">
              {/* Connector Line */}
              {index < phases.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-gray-600 to-gray-700" />
              )}

              <div className="bg-[#1a1a24] border border-gray-700 rounded-lg p-4 relative z-10 hover:border-[#00D9FF]/50 transition">
                {/* Phase Number */}
                <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${phase.color} flex items-center justify-center text-white font-bold text-lg mb-3 mx-auto`}>
                  {phase.number}
                </div>

                <h4 className="text-white font-semibold text-center mb-1">{phase.title}</h4>
                <p className="text-[#00D9FF] text-sm text-center mb-2">{phase.duration}</p>
                <p className="text-gray-400 text-xs text-center">{phase.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <div className="mb-10">
        <h3 className="text-lg font-semibold text-white mb-4 text-center">What the AI Does For You</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-[#1a1a24] rounded-lg border border-gray-700">
              <span className="text-green-400 text-lg">✓</span>
              <span className="text-gray-300 text-sm">{benefit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-10 max-w-lg mx-auto">
        <div className="text-center p-4 bg-[#1a1a24] rounded-lg border border-gray-700">
          <div className="text-2xl font-bold text-[#00D9FF]">30</div>
          <div className="text-xs text-gray-400">Days to Complete</div>
        </div>
        <div className="text-center p-4 bg-[#1a1a24] rounded-lg border border-gray-700">
          <div className="text-2xl font-bold text-green-400">100+</div>
          <div className="text-xs text-gray-400">Target Karma</div>
        </div>
        <div className="text-center p-4 bg-[#1a1a24] rounded-lg border border-gray-700">
          <div className="text-2xl font-bold text-purple-400">100%</div>
          <div className="text-xs text-gray-400">Automated</div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center">
        <button
          onClick={onStartWarmup}
          className="bg-gradient-to-r from-[#00D9FF] to-cyan-600 text-black font-semibold px-8 py-4 rounded-lg hover:from-cyan-400 hover:to-cyan-500 transition text-lg"
        >
          Start Warmup on My Account
        </button>
        <p className="text-gray-500 text-sm mt-3">
          Fully automated. No manual work required.
        </p>
      </div>
    </div>
  )
}

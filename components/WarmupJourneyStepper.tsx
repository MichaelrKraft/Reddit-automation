'use client'

interface WarmupJourneyStepperProps {
  status: string
  daysInWarmup: number
  karma: number
  isCompleted: boolean
}

export default function WarmupJourneyStepper({
  status,
  daysInWarmup,
  karma,
  isCompleted,
}: WarmupJourneyStepperProps) {
  // Map status to step number
  function getStepFromStatus(): number {
    if (status === 'COMPLETED') return 4
    if (status === 'NOT_STARTED') return 1
    if (status === 'PAUSED') return getCurrentPhaseStep()
    if (status === 'FAILED') return getCurrentPhaseStep()
    return getCurrentPhaseStep()
  }

  function getCurrentPhaseStep(): number {
    switch (status) {
      case 'PHASE_1_UPVOTES':
        return 2
      case 'PHASE_2_COMMENTS':
        return 2
      case 'PHASE_3_POSTS':
        return 3
      case 'PHASE_4_MIXED':
        return 3
      default:
        return 1
    }
  }

  const currentStep = getStepFromStatus()

  const steps = [
    {
      number: 1,
      label: 'Account Connected',
      shortLabel: 'Connected',
    },
    {
      number: 2,
      label: 'Warmup Active',
      shortLabel: 'Active',
    },
    {
      number: 3,
      label: 'Building Trust',
      shortLabel: 'Building',
    },
    {
      number: 4,
      label: 'Ready to Promote!',
      shortLabel: 'Ready!',
    },
  ]

  return (
    <div className="mb-4">
      {/* Stepper */}
      <div className="flex items-center justify-between relative">
        {/* Progress Line Background */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-700 z-0" />

        {/* Progress Line Filled */}
        <div
          className="absolute top-4 left-0 h-0.5 bg-gradient-to-r from-[#00D9FF] to-green-400 z-0 transition-all duration-500"
          style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
        />

        {steps.map((step) => {
          const isCompleted = step.number < currentStep
          const isCurrent = step.number === currentStep
          const isPending = step.number > currentStep

          return (
            <div key={step.number} className="relative z-10 flex flex-col items-center">
              {/* Step Circle */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isCurrent
                    ? 'bg-[#00D9FF] text-black ring-4 ring-[#00D9FF]/30'
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                {isCompleted ? '✓' : step.number}
              </div>

              {/* Step Label */}
              <div className="mt-2 text-center">
                <span
                  className={`text-xs font-medium ${
                    isCompleted
                      ? 'text-green-400'
                      : isCurrent
                      ? 'text-[#00D9FF]'
                      : 'text-gray-500'
                  }`}
                >
                  {step.shortLabel}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Current Status Message */}
      {isCompleted && (
        <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
          <span className="text-green-400 font-medium">
            This account is ready to promote! You've built trusted Reddit credibility.
          </span>
        </div>
      )}

      {status === 'PAUSED' && (
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center">
          <span className="text-yellow-400 font-medium">
            Warmup paused. Resume to continue building credibility.
          </span>
        </div>
      )}

      {status === 'FAILED' && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
          <span className="text-red-400 font-medium">
            Warmup failed. The account may have been flagged or shadowbanned.
          </span>
        </div>
      )}
    </div>
  )
}

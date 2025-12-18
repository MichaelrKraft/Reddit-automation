'use client'

import { useState, useEffect } from 'react'

interface FounderBannerProps {
  signupNumber: number
  founderSpotsRemaining: number
  hasLifetimeDeal: boolean
  canPurchaseLifetime: boolean
}

export default function FounderBanner({
  signupNumber,
  founderSpotsRemaining,
  hasLifetimeDeal,
  canPurchaseLifetime,
}: FounderBannerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  // Show banner after 5 second delay
  useEffect(() => {
    if (!isDismissed && !hasLifetimeDeal && canPurchaseLifetime) {
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [isDismissed, hasLifetimeDeal, canPurchaseLifetime])

  // Don't render if dismissed, already has lifetime deal, or can't purchase
  if (isDismissed || hasLifetimeDeal || !canPurchaseLifetime) {
    return null
  }

  const handleGetLifetimeDeal = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (data.error) {
        alert(data.error)
        return
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Failed to start checkout. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`fixed top-0 left-0 right-0 w-full bg-gradient-to-r from-orange-500 via-red-500 to-red-600 text-white py-2 px-4 z-[60] transition-transform duration-500 ease-out ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
          <span className="text-2xl">🎉</span>
          <div>
            <span className="font-bold">You're Founder #{signupNumber}!</span>
            <span className="mx-2">•</span>
            <span>Only {founderSpotsRemaining} founder spot{founderSpotsRemaining !== 1 ? 's' : ''} left!</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm opacity-90 hidden md:block">
            Lock in <span className="font-bold">LIFETIME</span> access for just{' '}
            <span className="font-bold">$29</span>
            <span className="text-xs opacity-75 ml-1">(normally $299)</span>
          </div>

          <button
            onClick={handleGetLifetimeDeal}
            disabled={isLoading}
            className="bg-white text-orange-600 px-5 py-2 rounded-lg font-bold hover:bg-orange-50 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap animate-pulse hover:animate-none hover:scale-105 hover:shadow-xl"
          >
            {isLoading ? 'Loading...' : 'Get Lifetime Deal →'}
          </button>

          <button
            onClick={() => setIsDismissed(true)}
            className="text-white/80 hover:text-white p-1 transition-colors"
            aria-label="Dismiss banner"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

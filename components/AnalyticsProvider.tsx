'use client'

import { createContext, useContext, useEffect, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import {
  trackPageView,
  trackFeatureDiscovery,
  trackError,
  detectRageClick,
  getFeatureFromPath
} from '@/lib/analytics'

interface AnalyticsContextType {
  isEnabled: boolean
}

const AnalyticsContext = createContext<AnalyticsContextType>({ isEnabled: false })

interface AnalyticsProviderProps {
  children: ReactNode
  enabled?: boolean
}

export function AnalyticsProvider({ children, enabled = true }: AnalyticsProviderProps) {
  const pathname = usePathname()
  const { isSignedIn } = useUser()

  // Only track for authenticated users
  const shouldTrack = enabled && isSignedIn

  // Track page views
  useEffect(() => {
    if (!shouldTrack) return

    // Track page view
    trackPageView({ page: pathname })

    // Track feature discovery for dashboard pages
    const feature = getFeatureFromPath(pathname)
    if (feature) {
      trackFeatureDiscovery(feature, pathname)
    }
  }, [pathname, shouldTrack])

  // Global error tracking
  useEffect(() => {
    if (!shouldTrack) return

    const handleError = (event: ErrorEvent) => {
      trackError(
        event.error || new Error(event.message),
        pathname,
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      )
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason))
      trackError(error, pathname, { type: 'unhandledRejection' })
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [pathname, shouldTrack])

  // Global click tracking for rage click detection
  useEffect(() => {
    if (!shouldTrack) return

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const className = typeof target.className === 'string' ? target.className : ''
      const targetId = target.id ||
        target.getAttribute('data-track') ||
        className.split(' ')[0] ||
        target.tagName.toLowerCase()

      detectRageClick(targetId, pathname)
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [pathname, shouldTrack])

  return (
    <AnalyticsContext.Provider value={{ isEnabled: shouldTrack ?? false }}>
      {children}
    </AnalyticsContext.Provider>
  )
}

export function useAnalyticsContext() {
  return useContext(AnalyticsContext)
}

export default AnalyticsProvider

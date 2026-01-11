'use client'

import { useCallback, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import {
  trackEvent,
  trackPageView,
  trackFeatureDiscovery,
  trackError,
  detectRageClick,
  getFeatureFromPath,
  type EventType,
  type TrackEventParams
} from '@/lib/analytics'

interface UseAnalyticsOptions {
  trackPageViews?: boolean
  trackFeatureDiscovery?: boolean
  trackErrors?: boolean
  trackRageClicks?: boolean
}

const defaultOptions: UseAnalyticsOptions = {
  trackPageViews: true,
  trackFeatureDiscovery: true,
  trackErrors: true,
  trackRageClicks: true
}

export function useAnalytics(options: UseAnalyticsOptions = {}) {
  const pathname = usePathname()
  const prevPathname = useRef<string | null>(null)
  const opts = { ...defaultOptions, ...options }

  // Track page views on route change
  useEffect(() => {
    if (!opts.trackPageViews) return
    if (pathname === prevPathname.current) return

    prevPathname.current = pathname
    trackPageView({ page: pathname })

    // Track feature discovery
    if (opts.trackFeatureDiscovery) {
      const feature = getFeatureFromPath(pathname)
      if (feature) {
        trackFeatureDiscovery(feature, pathname)
      }
    }
  }, [pathname, opts.trackPageViews, opts.trackFeatureDiscovery])

  // Global error handler
  useEffect(() => {
    if (!opts.trackErrors) return

    const handleError = (event: ErrorEvent) => {
      trackError(event.error || new Error(event.message), pathname, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      })
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
  }, [pathname, opts.trackErrors])

  // Track click with rage click detection
  const trackClick = useCallback((target: string, eventName?: string) => {
    if (opts.trackRageClicks) {
      detectRageClick(target, pathname)
    }

    trackEvent({
      eventType: 'click',
      eventName: eventName || 'button_click',
      page: pathname,
      target
    })
  }, [pathname, opts.trackRageClicks])

  // Generic event tracking
  const track = useCallback((
    eventType: EventType,
    eventName: string,
    target?: string,
    metadata?: Record<string, unknown>
  ) => {
    trackEvent({
      eventType,
      eventName,
      page: pathname,
      target,
      metadata
    })
  }, [pathname])

  // Track form submission
  const trackSubmit = useCallback((formName: string, data?: Record<string, unknown>) => {
    trackEvent({
      eventType: 'submit',
      eventName: `form_submit_${formName}`,
      page: pathname,
      target: formName,
      metadata: data
    })
  }, [pathname])

  // Track feature usage
  const trackFeature = useCallback((featureName: string, action: string, data?: Record<string, unknown>) => {
    trackEvent({
      eventType: 'feature_use',
      eventName: `${featureName}_${action}`,
      page: pathname,
      metadata: { feature: featureName, action, ...data }
    })
  }, [pathname])

  return {
    trackClick,
    track,
    trackSubmit,
    trackFeature,
    trackError: (error: Error, context?: Record<string, unknown>) =>
      trackError(error, pathname, context),
    pathname
  }
}

export default useAnalytics

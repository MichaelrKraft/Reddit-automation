/**
 * Client-side analytics tracking library
 * Tracks user events, page views, and feature usage
 */

// Generate a unique session ID for grouping events
const generateSessionId = (): string => {
  if (typeof window === 'undefined') return ''

  let sessionId = sessionStorage.getItem('analytics_session_id')
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    sessionStorage.setItem('analytics_session_id', sessionId)
  }
  return sessionId
}

// Track visited features to detect first visits
const getVisitedFeatures = (): Set<string> => {
  if (typeof window === 'undefined') return new Set()

  const stored = localStorage.getItem('visited_features')
  return stored ? new Set(JSON.parse(stored)) : new Set()
}

const markFeatureVisited = (feature: string): boolean => {
  if (typeof window === 'undefined') return false

  const visited = getVisitedFeatures()
  const isFirstVisit = !visited.has(feature)

  if (isFirstVisit) {
    visited.add(feature)
    localStorage.setItem('visited_features', JSON.stringify([...visited]))
  }

  return isFirstVisit
}

// Event types
export type EventType = 'click' | 'submit' | 'navigate' | 'feature_use' | 'error' | 'rage_click'

export interface TrackEventParams {
  eventType: EventType
  eventName: string
  page: string
  target?: string
  metadata?: Record<string, unknown>
}

export interface TrackPageViewParams {
  page: string
  referrer?: string
}

/**
 * Track a user event
 */
export async function trackEvent(params: TrackEventParams): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    const sessionId = generateSessionId()

    await fetch('/api/admin/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        sessionId,
        timestamp: new Date().toISOString()
      })
    })
  } catch (error) {
    console.error('[Analytics] Failed to track event:', error)
  }
}

/**
 * Track a page view
 */
export async function trackPageView(params: TrackPageViewParams): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    const sessionId = generateSessionId()

    await fetch('/api/admin/pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        sessionId,
        referrer: params.referrer || document.referrer,
        timestamp: new Date().toISOString()
      })
    })
  } catch (error) {
    console.error('[Analytics] Failed to track page view:', error)
  }
}

/**
 * Track feature discovery (first visit to a feature page)
 */
export async function trackFeatureDiscovery(feature: string, page: string): Promise<void> {
  const isFirstVisit = markFeatureVisited(feature)

  if (isFirstVisit) {
    await trackEvent({
      eventType: 'feature_use',
      eventName: `feature_first_visit_${feature}`,
      page,
      metadata: { feature, isFirstVisit: true }
    })
  }
}

/**
 * Track sidebar navigation click
 */
export async function trackSidebarClick(destination: string, currentPage: string): Promise<void> {
  await trackEvent({
    eventType: 'navigate',
    eventName: 'sidebar_nav_click',
    page: currentPage,
    target: destination,
    metadata: { destination }
  })
}

// ==========================================
// Reddit Account Connection Tracking
// ==========================================

export async function trackRedditConnectStarted(page: string): Promise<void> {
  await trackEvent({
    eventType: 'click',
    eventName: 'reddit_connect_started',
    page,
    target: 'connect_reddit_btn'
  })
}

export async function trackRedditConnectSuccess(page: string, username: string): Promise<void> {
  await trackEvent({
    eventType: 'submit',
    eventName: 'reddit_connect_success',
    page,
    metadata: { username }
  })
}

export async function trackRedditConnectFailed(page: string, error: string): Promise<void> {
  await trackEvent({
    eventType: 'error',
    eventName: 'reddit_connect_failed',
    page,
    metadata: { error }
  })
}

// ==========================================
// Post Creation Flow Tracking
// ==========================================

export async function trackPostCreateStarted(): Promise<void> {
  await trackEvent({
    eventType: 'navigate',
    eventName: 'post_create_started',
    page: '/dashboard/new-post'
  })
}

export async function trackPostCreateStep(step: number, data?: Record<string, unknown>): Promise<void> {
  await trackEvent({
    eventType: 'submit',
    eventName: `post_create_step_${step}`,
    page: '/dashboard/new-post',
    metadata: { step, ...data }
  })
}

export async function trackPostAIGenerate(subreddit: string): Promise<void> {
  await trackEvent({
    eventType: 'click',
    eventName: 'post_create_ai_generate',
    page: '/dashboard/new-post',
    target: 'ai_generate_btn',
    metadata: { subreddit }
  })
}

export async function trackPostViralCheck(score: number, subreddit: string): Promise<void> {
  await trackEvent({
    eventType: 'click',
    eventName: 'post_create_viral_check',
    page: '/dashboard/new-post',
    metadata: { score, subreddit }
  })
}

export async function trackPostScheduled(subreddit: string, scheduledAt?: string): Promise<void> {
  await trackEvent({
    eventType: 'submit',
    eventName: 'post_create_schedule',
    page: '/dashboard/new-post',
    metadata: { subreddit, scheduledAt }
  })
}

export async function trackPostCreateAbandoned(lastStep: number): Promise<void> {
  await trackEvent({
    eventType: 'navigate',
    eventName: 'post_create_abandoned',
    page: '/dashboard/new-post',
    metadata: { lastStep }
  })
}

// ==========================================
// Error Tracking
// ==========================================

export async function trackError(error: Error, page: string, context?: Record<string, unknown>): Promise<void> {
  await trackEvent({
    eventType: 'error',
    eventName: 'error_occurred',
    page,
    metadata: {
      errorMessage: error.message,
      errorStack: error.stack?.substring(0, 500),
      ...context
    }
  })
}

// ==========================================
// Rage Click Detection
// ==========================================

let clickBuffer: { target: string; timestamp: number }[] = []
const RAGE_CLICK_THRESHOLD = 3
const RAGE_CLICK_WINDOW_MS = 2000

export function detectRageClick(target: string, page: string): void {
  const now = Date.now()

  // Clear old clicks outside the window
  clickBuffer = clickBuffer.filter(click => now - click.timestamp < RAGE_CLICK_WINDOW_MS)

  // Add new click
  clickBuffer.push({ target, timestamp: now })

  // Check for rage clicks on same target
  const sameTargetClicks = clickBuffer.filter(click => click.target === target)

  if (sameTargetClicks.length >= RAGE_CLICK_THRESHOLD) {
    trackEvent({
      eventType: 'rage_click',
      eventName: 'rage_click',
      page,
      target,
      metadata: { clickCount: sameTargetClicks.length }
    })

    // Clear buffer after detecting rage click
    clickBuffer = []
  }
}

// ==========================================
// Feature-specific tracking helpers
// ==========================================

export const featureNames = {
  warmup: 'warmup',
  spyMode: 'spy-mode',
  viral: 'viral',
  timing: 'timing',
  speedAlerts: 'speed-alerts',
  opportunities: 'opportunities',
  keywordAlerts: 'keyword-alerts',
  seoFinder: 'seo-finder',
  leaderboard: 'leaderboard',
  analytics: 'analytics',
  newPost: 'new-post',
  posts: 'posts',
  drafts: 'drafts',
  calendar: 'calendar',
  comments: 'comments',
  discover: 'discover',
  analyze: 'analyze'
} as const

export type FeatureName = typeof featureNames[keyof typeof featureNames]

/**
 * Get feature name from page path
 */
export function getFeatureFromPath(path: string): FeatureName | null {
  const match = path.match(/\/dashboard\/([^/]+)/)
  if (!match) return null

  const segment = match[1]
  return Object.values(featureNames).includes(segment as FeatureName)
    ? (segment as FeatureName)
    : null
}

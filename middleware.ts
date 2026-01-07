import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/posts(.*)',
  '/api/campaigns(.*)',
  '/api/subreddits(.*)',
  '/api/analytics(.*)',
  '/api/viral(.*)',
  '/api/speed-alerts(.*)',
  '/api/brand-mentions(.*)',
  '/api/spy-mode(.*)',
  // '/api/opportunities(.*)', // Temporarily removed for testing
])

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/health',
  '/api/opportunities(.*)', // Temporarily public for testing
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { findSEOThreads, estimateMonthlyTraffic, hasLifetimeDeal } from '@/lib/seo-finder'

// POST - Search for Reddit threads ranking on Google
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has lifetime deal
    if (!user.hasLifetimeDeal) {
      return NextResponse.json({
        error: 'SEO Thread Finder is available for lifetime deal holders only.',
        upgradeRequired: true
      }, { status: 403 })
    }

    const body = await request.json()
    const { keyword } = body

    if (!keyword || typeof keyword !== 'string') {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 })
    }

    // Check daily search limit (25 searches per day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const searchesToday = await prisma.sEOSearch.count({
      where: {
        userId: user.id,
        searchedAt: { gte: today }
      }
    })

    if (searchesToday >= 25) {
      return NextResponse.json({
        error: 'Daily search limit reached (25 searches/day). Try again tomorrow.',
        limitReached: true
      }, { status: 429 })
    }

    // Check if we're in demo mode (no SerpAPI key)
    const demoMode = !process.env.SERPAPI_KEY

    // Perform the search
    const threads = await findSEOThreads(keyword.trim(), user.id)

    // Add traffic estimates
    const threadsWithTraffic = threads.map(thread => ({
      ...thread,
      estimatedTraffic: estimateMonthlyTraffic(thread.rank)
    }))

    return NextResponse.json({
      keyword: keyword.trim(),
      threads: threadsWithTraffic,
      searchesRemaining: 25 - searchesToday - 1,
      demoMode
    })

  } catch (error: any) {
    console.error('[SEO Search] Error:', error)

    // Handle SerpAPI not configured
    if (error.message?.includes('SERPAPI_KEY')) {
      return NextResponse.json({
        error: 'SEO search is temporarily unavailable. Please try again later.',
        configError: true
      }, { status: 503 })
    }

    return NextResponse.json({
      error: error.message || 'Failed to search'
    }, { status: 500 })
  }
}

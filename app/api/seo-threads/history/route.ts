import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getSEOSearchHistory, estimateMonthlyTraffic } from '@/lib/seo-finder'

// GET - Get user's SEO search history
export async function GET(request: NextRequest) {
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

    // Get search history
    const history = await getSEOSearchHistory(user.id, 20)

    // Add traffic estimates to threads
    const historyWithTraffic = history.map(search => ({
      ...search,
      threads: search.threads.map(thread => ({
        ...thread,
        estimatedTraffic: estimateMonthlyTraffic(thread.googleRank)
      }))
    }))

    // Get today's search count
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const searchesToday = await prisma.sEOSearch.count({
      where: {
        userId: user.id,
        searchedAt: { gte: today }
      }
    })

    return NextResponse.json({
      history: historyWithTraffic,
      searchesRemaining: 25 - searchesToday
    })

  } catch (error: any) {
    console.error('[SEO History] Error:', error)
    return NextResponse.json({
      error: error.message || 'Failed to get history'
    }, { status: 500 })
  }
}

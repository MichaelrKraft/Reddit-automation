import { NextResponse } from 'next/server'
import {
  calculateScore,
  determineTrendDirection,
  recalculateOpportunityScore,
} from '@/lib/opportunity-scorer'

// Test endpoint for the scoring algorithm
// Access via: GET /api/test-scorer
export async function GET() {
  const results: { name: string; passed: boolean; details: any }[] = []

  // Test 1: Calculate score
  try {
    const input = {
      mentionCount: 25,
      timeWindowDays: 30,
      avgUpvotes: 250,
      avgComments: 30,
      maxUpvotes: 1500,
      avgSentiment: -0.6, // Negative = pain point
      recentMentions: 18,
      olderMentions: 7,
      subredditCount: 4,
      aiConfidence: 0.85,
      hasCompetitorMentions: true,
    }

    const score = calculateScore(input)
    const isValid = score.total >= 0 && score.total <= 100
    results.push({
      name: 'Calculate Score',
      passed: isValid,
      details: {
        input,
        score,
        valid: isValid,
      },
    })
  } catch (error: any) {
    results.push({
      name: 'Calculate Score',
      passed: false,
      details: { error: error.message },
    })
  }

  // Test 2: Trend direction
  try {
    const growing = determineTrendDirection(20, 10)
    const stable = determineTrendDirection(10, 10)
    const declining = determineTrendDirection(5, 15)
    const passed =
      growing === 'GROWING' && stable === 'STABLE' && declining === 'DECLINING'
    results.push({
      name: 'Trend Direction',
      passed,
      details: {
        growing: { input: '20 recent, 10 old', result: growing, expected: 'GROWING' },
        stable: { input: '10 recent, 10 old', result: stable, expected: 'STABLE' },
        declining: { input: '5 recent, 15 old', result: declining, expected: 'DECLINING' },
      },
    })
  } catch (error: any) {
    results.push({
      name: 'Trend Direction',
      passed: false,
      details: { error: error.message },
    })
  }

  // Test 3: Edge cases
  try {
    const zeroInput = {
      mentionCount: 0,
      timeWindowDays: 30,
      avgUpvotes: 0,
      avgComments: 0,
      maxUpvotes: 0,
      avgSentiment: 0,
      recentMentions: 0,
      olderMentions: 0,
      subredditCount: 0,
      aiConfidence: 0,
      hasCompetitorMentions: false,
    }
    const zeroScore = calculateScore(zeroInput)

    const maxInput = {
      mentionCount: 200,
      timeWindowDays: 30,
      avgUpvotes: 1000,
      avgComments: 100,
      maxUpvotes: 5000,
      avgSentiment: -0.9,
      recentMentions: 50,
      olderMentions: 10,
      subredditCount: 8,
      aiConfidence: 0.95,
      hasCompetitorMentions: true,
    }
    const maxScore = calculateScore(maxInput)

    const passed = zeroScore.total >= 0 && maxScore.total >= 0 && maxScore.total <= 100
    results.push({
      name: 'Edge Cases',
      passed,
      details: {
        zeroInput: { total: zeroScore.total },
        maxInput: { total: maxScore.total },
      },
    })
  } catch (error: any) {
    results.push({
      name: 'Edge Cases',
      passed: false,
      details: { error: error.message },
    })
  }

  // Test 4: Recalculate from evidence
  try {
    const evidence = [
      {
        upvotes: 100,
        commentCount: 20,
        sentimentScore: -0.5,
        postedAt: new Date(),
        subreddit: 'test1',
      },
      {
        upvotes: 200,
        commentCount: 40,
        sentimentScore: -0.3,
        postedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        subreddit: 'test2',
      },
      {
        upvotes: 150,
        commentCount: 30,
        sentimentScore: -0.7,
        postedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        subreddit: 'test1',
      },
    ]

    const result = recalculateOpportunityScore(evidence, 0.8, true)
    const passed = result.score.total >= 0 && result.score.total <= 100
    results.push({
      name: 'Recalculate From Evidence',
      passed,
      details: {
        evidenceCount: evidence.length,
        score: result.score,
        trendDirection: result.trendDirection,
      },
    })
  } catch (error: any) {
    results.push({
      name: 'Recalculate From Evidence',
      passed: false,
      details: { error: error.message },
    })
  }

  // Summary
  const allPassed = results.every((r) => r.passed)
  const passedCount = results.filter((r) => r.passed).length

  return NextResponse.json({
    summary: {
      allPassed,
      passed: passedCount,
      total: results.length,
    },
    results,
  })
}

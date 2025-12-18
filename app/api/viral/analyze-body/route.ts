import { NextRequest, NextResponse } from 'next/server'
import { calculateViralBodyScore, getViralBodyPrompt } from '@/lib/viral-body-score'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// POST /api/viral/analyze-body - Analyze body copy for viral potential
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await request.json()
    const { content, subreddit, postType = 'story', generateImproved = false } = body

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    // Calculate viral score using the algorithm
    const analysis = calculateViralBodyScore(content, subreddit, postType)

    let improvedVersions: string[] = []
    if (generateImproved && analysis.score < 80) {
      improvedVersions = await generateImprovedBodyCopy(content, subreddit, analysis.suggestions)
    }

    return NextResponse.json({
      score: analysis.score,
      tier: analysis.tier,
      breakdown: analysis.breakdown,
      suggestions: analysis.suggestions,
      improvedVersions,
      expectedPerformance: analysis.expectedPerformance,
      detectedPattern: analysis.detectedPattern,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Viral body analysis error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function generateImprovedBodyCopy(
  originalContent: string,
  subreddit: string,
  suggestions: string[]
): Promise<string[]> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const viralRules = getViralBodyPrompt()

    const prompt = `
You are a Reddit viral content expert. Improve this body copy to maximize viral potential.

Original Content:
"""
${originalContent.slice(0, 2000)}
"""

Target Subreddit: r/${subreddit || 'general'}

Improvement suggestions from our analysis:
${suggestions.map(s => `- ${s}`).join('\n')}

${viralRules}

Generate ONE improved version that:
1. Applies the viral body copy rules above
2. Maintains the original message/story
3. Adds emotional hooks and proper structure
4. Includes dialogue where appropriate
5. Has proper paragraph breaks

Return ONLY the improved body copy text, no explanations or JSON.
`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    return [text.trim()]
  } catch (error) {
    console.error('Failed to generate improved body copy:', error)
    return []
  }
}

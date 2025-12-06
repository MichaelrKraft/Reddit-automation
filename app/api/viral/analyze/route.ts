import { NextRequest, NextResponse } from 'next/server'
import { calculateViralScore } from '@/lib/viral-score'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// POST /api/viral/analyze - Analyze a headline for viral potential
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await request.json()
    const { title, subreddit, postType = 'text', content } = body

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // Calculate viral score using the algorithm
    const analysis = calculateViralScore(title, subreddit, postType)

    // Generate AI-powered improved titles
    const improvedTitles = await generateAITitles(title, subreddit, analysis.suggestions)

    // Save draft to database
    const draft = await prisma.draftPost.create({
      data: {
        title,
        content: content || null,
        subreddit: subreddit || 'general',
        postType,
        viralScore: analysis.score,
        scoreBreakdown: JSON.stringify(analysis.breakdown),
        suggestions: JSON.stringify(analysis.suggestions),
        improvedTitles: JSON.stringify(improvedTitles),
        userId: user.id,
      },
    })

    return NextResponse.json({
      id: draft.id,
      score: analysis.score,
      tier: analysis.tier,
      breakdown: analysis.breakdown,
      suggestions: analysis.suggestions,
      improvedTitles,
      expectedPerformance: analysis.expectedPerformance,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Viral analysis error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function generateAITitles(
  originalTitle: string,
  subreddit: string,
  suggestions: string[]
): Promise<string[]> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const prompt = `
You are a Reddit viral headline expert. Based on analysis of 4,944 viral Reddit posts, generate 3 improved versions of this headline.

Original Title: "${originalTitle}"
Target Subreddit: r/${subreddit || 'general'}

Improvement suggestions from our analysis:
${suggestions.map(s => `- ${s}`).join('\n')}

Key viral headline principles:
- Use 8-15 words (sweet spot: 12 words)
- 35% of viral posts use first-person (I, my, me)
- Statements get more upvotes than questions
- Use power words: you, people, just, never, finally, realized
- Keep words simple (avg 4.75 chars/word)
- Include transformation arc (but, finally, then, realized)
- Use sentence case, not Title Case or ALL CAPS

Generate exactly 3 improved headlines that are distinctly different approaches:
1. A more personal, story-driven version
2. A more direct, statement-based version
3. A curiosity-driven version that hints at value

Return ONLY valid JSON array with exactly 3 strings:
["headline 1", "headline 2", "headline 3"]
`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Extract JSON array
    const match = text.match(/\[[\s\S]*\]/)
    if (match) {
      const parsed = JSON.parse(match[0])
      if (Array.isArray(parsed) && parsed.length >= 3) {
        return parsed.slice(0, 3)
      }
    }

    // Fallback titles
    return [
      `I tried ${originalTitle.toLowerCase().replace(/^(a|an|the)\s+/, '')} and here's what happened`,
      `${originalTitle} - and it changed everything`,
      `The truth about ${originalTitle.toLowerCase().replace(/^(a|an|the|i|my)\s+/, '')}`,
    ]
  } catch (error) {
    console.error('Failed to generate AI titles:', error)
    // Generate meaningful fallback alternatives based on viral principles
    const cleaned = originalTitle.toLowerCase().replace(/^(a|an|the)\s+/, '')
    return [
      `I finally ${cleaned} and here's what happened`,
      `The real reason people ${cleaned.replace(/^(i|my)\s+/, '')}`,
      `After years of trying, I realized ${cleaned.replace(/^(i|my)\s+/, '')} works`,
    ]
  }
}

// GET /api/viral/analyze - Get user's draft analyses
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    const drafts = await prisma.draftPost.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // Parse JSON fields
    const parsedDrafts = drafts.map(draft => ({
      ...draft,
      scoreBreakdown: JSON.parse(draft.scoreBreakdown),
      suggestions: JSON.parse(draft.suggestions),
      improvedTitles: JSON.parse(draft.improvedTitles),
    }))

    return NextResponse.json({ drafts: parsedDrafts })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

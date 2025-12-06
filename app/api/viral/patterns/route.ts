import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/viral/patterns - Get viral patterns for a subreddit
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const subreddit = searchParams.get('subreddit')

    if (subreddit) {
      // Get specific subreddit pattern
      const pattern = await prisma.viralPattern.findUnique({
        where: { subreddit: subreddit.toLowerCase() },
      })

      if (pattern) {
        return NextResponse.json({
          pattern: {
            ...pattern,
            topWords: JSON.parse(pattern.topWords),
          },
        })
      }

      // Return default pattern for unknown subreddit
      return NextResponse.json({
        pattern: getDefaultPattern(subreddit),
      })
    }

    // Return all patterns
    const patterns = await prisma.viralPattern.findMany({
      orderBy: { avgScore: 'desc' },
    })

    return NextResponse.json({
      patterns: patterns.map(p => ({
        ...p,
        topWords: JSON.parse(p.topWords),
      })),
    })
  } catch (error: any) {
    console.error('Failed to fetch viral patterns:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/viral/patterns - Seed or update viral patterns
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { subreddit, avgTitleLength, firstPersonRate, questionRate, avgScore, contentType, topWords, formula, exampleTitle } = body

    if (!subreddit) {
      return NextResponse.json({ error: 'Subreddit is required' }, { status: 400 })
    }

    const pattern = await prisma.viralPattern.upsert({
      where: { subreddit: subreddit.toLowerCase() },
      update: {
        avgTitleLength: avgTitleLength ?? 12,
        firstPersonRate: firstPersonRate ?? 0.35,
        questionRate: questionRate ?? 0.25,
        avgScore: avgScore ?? 500,
        contentType: contentType ?? 'text',
        topWords: JSON.stringify(topWords ?? ['you', 'people', 'just']),
        formula: formula ?? 'Standard viral formula',
        exampleTitle: exampleTitle ?? null,
      },
      create: {
        subreddit: subreddit.toLowerCase(),
        avgTitleLength: avgTitleLength ?? 12,
        firstPersonRate: firstPersonRate ?? 0.35,
        questionRate: questionRate ?? 0.25,
        avgScore: avgScore ?? 500,
        contentType: contentType ?? 'text',
        topWords: JSON.stringify(topWords ?? ['you', 'people', 'just']),
        formula: formula ?? 'Standard viral formula',
        exampleTitle: exampleTitle ?? null,
      },
    })

    return NextResponse.json({ pattern })
  } catch (error: any) {
    console.error('Failed to update viral pattern:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function getDefaultPattern(subreddit: string) {
  // Research-based default patterns from the 4,944 post analysis
  const knownPatterns: Record<string, any> = {
    funny: {
      subreddit: 'funny',
      avgTitleLength: 6,
      firstPersonRate: 0.15,
      questionRate: 0.10,
      avgScore: 4475,
      contentType: 'image',
      topWords: ['me', 'when', 'my', 'this', 'the'],
      formula: 'Short, punchy titles with visual content. Relatable situations.',
      exampleTitle: 'Me trying to adult',
    },
    showerthoughts: {
      subreddit: 'showerthoughts',
      avgTitleLength: 21,
      firstPersonRate: 0.25,
      questionRate: 0.30,
      avgScore: 2661,
      contentType: 'text',
      topWords: ['you', 'the', 'is', 'a', 'of', 'when', 'we', 'are', 'your', 'to'],
      formula: 'Clever, philosophical observations. Unique perspectives on everyday things.',
      exampleTitle: 'The first person to hear a parrot talk was probably not believed',
    },
    amitheasshole: {
      subreddit: 'amitheasshole',
      avgTitleLength: 15,
      firstPersonRate: 0.78,
      questionRate: 0.67,
      avgScore: 633,
      contentType: 'text',
      topWords: ['aita', 'my', 'i', 'for', 'me', 'not', 'to', 'the', 'a', 'her'],
      formula: 'First-person moral dilemmas. Relationship and family conflicts.',
      exampleTitle: 'AITA for refusing to give my sister my wedding dress?',
    },
    tifu: {
      subreddit: 'tifu',
      avgTitleLength: 12,
      firstPersonRate: 0.57,
      questionRate: 0.05,
      avgScore: 514,
      contentType: 'text',
      topWords: ['tifu', 'by', 'my', 'i', 'to', 'the', 'a', 'and', 'in', 'it'],
      formula: 'Embarrassing first-person stories. Unexpected consequences.',
      exampleTitle: 'TIFU by accidentally sending a risky text to my boss',
    },
    askreddit: {
      subreddit: 'askreddit',
      avgTitleLength: 10,
      firstPersonRate: 0.10,
      questionRate: 1.0,
      avgScore: 1500,
      contentType: 'text',
      topWords: ['what', 'you', 'your', 'is', 'the', 'of', 'do', 'would', 'if', 'have'],
      formula: 'Open-ended questions. Universal topics that encourage sharing.',
      exampleTitle: 'What is something you learned embarrassingly late in life?',
    },
    todayilearned: {
      subreddit: 'todayilearned',
      avgTitleLength: 22,
      firstPersonRate: 0.05,
      questionRate: 0.02,
      avgScore: 2000,
      contentType: 'link',
      topWords: ['til', 'that', 'the', 'a', 'was', 'is', 'in', 'of', 'to', 'and'],
      formula: 'Surprising facts with sources. Historical or scientific trivia.',
      exampleTitle: 'TIL that honey never spoils and archaeologists found 3000-year-old honey in Egyptian tombs that was still edible',
    },
    lifeprotips: {
      subreddit: 'lifeprotips',
      avgTitleLength: 14,
      firstPersonRate: 0.20,
      questionRate: 0.05,
      avgScore: 800,
      contentType: 'text',
      topWords: ['lpt', 'you', 'your', 'if', 'to', 'the', 'a', 'when', 'don\'t', 'it'],
      formula: 'Actionable advice. Simple solutions to common problems.',
      exampleTitle: 'LPT: If you want to learn something new, teach it to someone else',
    },
  }

  return knownPatterns[subreddit.toLowerCase()] || {
    subreddit,
    avgTitleLength: 12,
    firstPersonRate: 0.35,
    questionRate: 0.25,
    avgScore: 500,
    contentType: 'text',
    topWords: ['you', 'people', 'just', 'my', 'the'],
    formula: 'Follow general viral principles: personal stories, power words, simple language.',
    exampleTitle: null,
  }
}

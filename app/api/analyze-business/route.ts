import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { analyzeBusiness } from '@/lib/ai'

// Fetch and extract text content from a URL
async function fetchWebsiteContent(url: string): Promise<string> {
  try {
    // Ensure URL has protocol
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`

    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ReddRide/1.0; Business Analyzer)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(15000), // 15 second timeout
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`)
    }

    const html = await response.text()

    // Extract text content from HTML (simple extraction)
    const textContent = html
      // Remove script and style tags and their contents
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      // Remove HTML tags
      .replace(/<[^>]+>/g, ' ')
      // Decode HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim()

    return textContent
  } catch (error: any) {
    console.error('[AnalyzeBusiness] Fetch error:', error)
    throw new Error(`Could not fetch website: ${error.message}`)
  }
}

// GET - Retrieve existing analysis for a URL
export async function GET(request: NextRequest) {
  try {
    const user = await getOrCreateUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')

    if (url) {
      // Get specific analysis
      const analysis = await prisma.businessAnalysis.findFirst({
        where: { userId: user.id, url },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json({ analysis })
    }

    // Get all analyses for user
    const analyses = await prisma.businessAnalysis.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return NextResponse.json({ analyses })
  } catch (error: any) {
    console.error('[AnalyzeBusiness] GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Analyze a new business URL
export async function POST(request: NextRequest) {
  try {
    const user = await getOrCreateUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { url } = body

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Normalize URL
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`

    // Check for existing recent analysis (within 24 hours)
    const existingAnalysis = await prisma.businessAnalysis.findFirst({
      where: {
        userId: user.id,
        url: normalizedUrl,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (existingAnalysis) {
      return NextResponse.json({
        analysis: {
          id: existingAnalysis.id,
          url: existingAnalysis.url,
          businessName: existingAnalysis.businessName,
          businessType: existingAnalysis.businessType,
          description: existingAnalysis.description,
          targetAudience: existingAnalysis.targetAudience ? JSON.parse(existingAnalysis.targetAudience) : [],
          painPoints: existingAnalysis.painPoints ? JSON.parse(existingAnalysis.painPoints) : [],
          subreddits: existingAnalysis.subreddits ? JSON.parse(existingAnalysis.subreddits) : [],
          keywords: existingAnalysis.keywords ? JSON.parse(existingAnalysis.keywords) : [],
          createdAt: existingAnalysis.createdAt,
        },
        cached: true,
      })
    }

    // Fetch website content
    console.log('[AnalyzeBusiness] Fetching content from:', normalizedUrl)
    const websiteContent = await fetchWebsiteContent(normalizedUrl)

    if (websiteContent.length < 100) {
      return NextResponse.json(
        { error: 'Could not extract enough content from the website. Please try a different URL.' },
        { status: 400 }
      )
    }

    // Analyze with AI
    console.log('[AnalyzeBusiness] Analyzing with AI...')
    const result = await analyzeBusiness(normalizedUrl, websiteContent)

    // Save to database
    const savedAnalysis = await prisma.businessAnalysis.create({
      data: {
        userId: user.id,
        url: normalizedUrl,
        businessName: result.businessName,
        businessType: result.businessType,
        description: result.description,
        targetAudience: JSON.stringify(result.targetAudience),
        painPoints: JSON.stringify(result.painPoints),
        subreddits: JSON.stringify(result.subreddits),
        keywords: JSON.stringify(result.keywords),
      },
    })

    return NextResponse.json({
      analysis: {
        id: savedAnalysis.id,
        url: savedAnalysis.url,
        businessName: result.businessName,
        businessType: result.businessType,
        description: result.description,
        targetAudience: result.targetAudience,
        painPoints: result.painPoints,
        subreddits: result.subreddits,
        keywords: result.keywords,
        createdAt: savedAnalysis.createdAt,
      },
      cached: false,
    })
  } catch (error: any) {
    console.error('[AnalyzeBusiness] POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

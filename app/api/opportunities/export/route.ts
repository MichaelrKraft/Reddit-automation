import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { OpportunityCategory, OpportunityStatus } from '@prisma/client'

interface ExportOpportunity {
  id: string
  title: string
  category: string
  score: number
  problemStatement: string
  status: string
  trendDirection: string
  evidenceCount: number
  firstSeenAt: string
  lastUpdatedAt: string
  subreddits: string[]
  themes: string[]
  keywords: string[]
  topEvidence: Array<{
    quote: string
    author: string | null
    subreddit: string
    upvotes: number
    url: string
  }>
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const format = searchParams.get('format') || 'json' // json, csv
    const status = searchParams.get('status') as OpportunityStatus | null
    const category = searchParams.get('category') as OpportunityCategory | null
    const minScore = searchParams.get('minScore')
    const ids = searchParams.get('ids') // Comma-separated list of opportunity IDs

    // Build where clause
    const where: any = {
      userId: user.id,
    }

    if (status) {
      where.status = status
    }

    if (category) {
      where.category = category
    }

    if (minScore) {
      where.score = { gte: parseInt(minScore) }
    }

    if (ids) {
      where.id = { in: ids.split(',') }
    }

    // Fetch opportunities with evidence
    const opportunities = await prisma.opportunity.findMany({
      where,
      include: {
        evidence: {
          orderBy: { upvotes: 'desc' },
          take: 5,
        },
        subreddits: {
          orderBy: { mentionCount: 'desc' },
        },
      },
      orderBy: { score: 'desc' },
    })

    // Transform to export format
    const exportData: ExportOpportunity[] = opportunities.map((opp) => {
      const metadata = opp.metadata as { themes?: string[]; keywords?: string[] } | null

      return {
        id: opp.id,
        title: opp.title,
        category: opp.category,
        score: opp.score,
        problemStatement: opp.problemStatement,
        status: opp.status,
        trendDirection: opp.trendDirection,
        evidenceCount: opp.evidenceCount,
        firstSeenAt: opp.firstSeenAt.toISOString(),
        lastUpdatedAt: opp.lastUpdatedAt.toISOString(),
        subreddits: opp.subreddits.map((s) => s.subreddit),
        themes: metadata?.themes || [],
        keywords: metadata?.keywords || [],
        topEvidence: opp.evidence.map((e) => ({
          quote: e.quoteText,
          author: e.author,
          subreddit: e.subreddit,
          upvotes: e.upvotes,
          url: e.redditPostUrl,
        })),
      }
    })

    // Record export action
    await prisma.opportunityAction.createMany({
      data: opportunities.map((opp) => ({
        opportunityId: opp.id,
        userId: user.id,
        actionType: 'EXPORTED',
        metadata: JSON.parse(JSON.stringify({ format, exportedAt: new Date().toISOString() })),
      })),
    })

    // Return based on format
    if (format === 'csv') {
      const csvRows = [
        // Header
        [
          'ID',
          'Title',
          'Category',
          'Score',
          'Status',
          'Trend',
          'Evidence Count',
          'Subreddits',
          'Problem Statement',
          'First Seen',
          'Last Updated',
        ].join(','),
        // Data rows
        ...exportData.map((opp) =>
          [
            opp.id,
            `"${opp.title.replace(/"/g, '""')}"`,
            opp.category,
            opp.score,
            opp.status,
            opp.trendDirection,
            opp.evidenceCount,
            `"${opp.subreddits.join(', ')}"`,
            `"${opp.problemStatement.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
            opp.firstSeenAt,
            opp.lastUpdatedAt,
          ].join(',')
        ),
      ].join('\n')

      return new NextResponse(csvRows, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="opportunities-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    // Default JSON format
    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      count: exportData.length,
      opportunities: exportData,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error exporting opportunities:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

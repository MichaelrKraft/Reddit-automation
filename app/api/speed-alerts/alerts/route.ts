import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'

// GET /api/speed-alerts/alerts - Get recent alerts
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const subredditId = searchParams.get('subredditId')

    const whereClause: any = {
      monitoredSubreddit: {
        userId: user.id,
      },
    }

    if (subredditId) {
      whereClause.monitoredSubredditId = subredditId
    }

    const alerts = await prisma.alertHistory.findMany({
      where: whereClause,
      include: {
        monitoredSubreddit: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ alerts })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/speed-alerts/alerts - Mark alert as acted on
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await request.json()
    const { alertId, wasActedOn, responseTime } = body

    if (!alertId) {
      return NextResponse.json(
        { error: 'Alert ID is required' },
        { status: 400 }
      )
    }

    // Verify ownership through the monitored subreddit relation
    const alert = await prisma.alertHistory.findFirst({
      where: {
        id: alertId,
        monitoredSubreddit: {
          userId: user.id,
        },
      },
    })

    if (!alert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      )
    }

    const updated = await prisma.alertHistory.update({
      where: { id: alertId },
      data: {
        wasActedOn: wasActedOn ?? true,
        responseTime: responseTime ?? null,
      },
    })

    return NextResponse.json({ alert: updated })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/speed-alerts/alerts - Delete single alert or clear old/all alerts
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(request.url)
    const alertId = searchParams.get('id')
    const olderThanDays = searchParams.get('olderThanDays')
    const clearAll = searchParams.get('clearAll')

    // Delete single alert by ID
    if (alertId) {
      // Verify ownership through the monitored subreddit relation
      const alert = await prisma.alertHistory.findFirst({
        where: {
          id: alertId,
          monitoredSubreddit: {
            userId: user.id,
          },
        },
      })

      if (!alert) {
        return NextResponse.json(
          { error: 'Alert not found' },
          { status: 404 }
        )
      }

      await prisma.alertHistory.delete({
        where: { id: alertId },
      })

      return NextResponse.json({ success: true, deletedId: alertId })
    }

    // Clear all alerts
    if (clearAll === 'true') {
      const deleted = await prisma.alertHistory.deleteMany({
        where: {
          monitoredSubreddit: {
            userId: user.id,
          },
        },
      })

      return NextResponse.json({ success: true, deletedCount: deleted.count })
    }

    // Bulk delete old alerts
    const days = parseInt(olderThanDays || '7')
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const deleted = await prisma.alertHistory.deleteMany({
      where: {
        monitoredSubreddit: {
          userId: user.id,
        },
        createdAt: {
          lt: cutoffDate,
        },
      },
    })

    return NextResponse.json({ deletedCount: deleted.count })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

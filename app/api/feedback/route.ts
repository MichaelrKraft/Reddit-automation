import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { sendFeedbackNotification } from '@/lib/email'

// POST /api/feedback - Submit alpha feedback
export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req)
    const body = await req.json()

    const { type, message, rating, name, email, page, userAgent } = body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Store feedback in database
    const feedback = await prisma.alphaFeedback.create({
      data: {
        clerkId: userId || null,
        type: type || 'general',
        message: message.trim(),
        rating: rating && rating >= 1 && rating <= 5 ? rating : null,
        name: name?.trim() || null,
        email: email?.trim() || null,
        page: page || null,
        userAgent: userAgent || null,
        status: 'new',
      },
    })

    // Log for easy monitoring during alpha
    console.log('[Alpha Feedback]', {
      id: feedback.id,
      type: feedback.type,
      rating: feedback.rating,
      clerkId: feedback.clerkId,
      page: feedback.page,
      messagePreview: feedback.message.substring(0, 100),
    })

    // Send email notification (non-blocking)
    sendFeedbackNotification({
      id: feedback.id,
      type: feedback.type,
      message: feedback.message,
      name: feedback.name,
      email: feedback.email,
      page: feedback.page,
      clerkId: feedback.clerkId,
      createdAt: feedback.createdAt,
    }).catch((err) => {
      console.error('[Alpha Feedback] Email notification failed:', err)
    })

    return NextResponse.json({
      success: true,
      id: feedback.id,
    })
  } catch (error) {
    console.error('Error saving feedback:', error)
    return NextResponse.json(
      { error: 'Failed to save feedback' },
      { status: 500 }
    )
  }
}

// GET /api/feedback - List feedback (admin only, for future use)
export async function GET(req: NextRequest) {
  try {
    const { userId } = getAuth(req)

    // TODO: Add admin check here
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')

    const feedback = await prisma.alphaFeedback.findMany({
      where: {
        ...(status && { status }),
        ...(type && { type }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({
      feedback,
      count: feedback.length,
    })
  } catch (error) {
    console.error('Error fetching feedback:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    )
  }
}

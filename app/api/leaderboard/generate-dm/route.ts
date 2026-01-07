import { NextRequest, NextResponse } from 'next/server'
import { generateCompletion } from '@/lib/ai'
import { requireUser } from '@/lib/auth'

// POST /api/leaderboard/generate-dm - Generate AI message for Reddit DM
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    await requireUser()

    const body = await request.json()
    const { username, postTitle, postUrl, subreddit } = body

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

    // Build context-aware prompt
    let prompt: string

    if (postTitle && subreddit) {
      // Have post context - generate personalized message
      prompt = `Generate a brief, friendly Reddit DM to reach out to u/${username}.

Context: They recently posted "${postTitle}" in r/${subreddit} which performed well.

Requirements:
- 2-3 sentences max
- Friendly and professional tone
- Reference their post naturally
- Express genuine interest in connecting
- Don't be salesy or spammy
- End with a question to encourage response

Return ONLY the message text, no quotes or formatting.`
    } else {
      // No post context - generate generic networking message
      prompt = `Generate a brief, friendly Reddit DM to reach out to u/${username}.

Context: This user is an active and influential contributor on Reddit.

Requirements:
- 2-3 sentences max
- Friendly and professional tone
- Express genuine interest in connecting
- Don't be salesy or spammy
- End with a question to encourage response

Return ONLY the message text, no quotes or formatting.`
    }

    console.log(`[DM Generator] Generating message for u/${username}${postTitle ? ` about "${postTitle}"` : ''}`)

    const message = await generateCompletion(prompt)

    // Clean up the response (remove quotes if AI wrapped it)
    const cleanMessage = message
      .trim()
      .replace(/^["']|["']$/g, '') // Remove leading/trailing quotes
      .trim()

    console.log(`[DM Generator] Generated message (${cleanMessage.length} chars)`)

    return NextResponse.json({ message: cleanMessage })
  } catch (error: any) {
    console.error('[DM Generator] Error:', error.message)

    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to generate message. Please try again.' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import { generateReply } from '@/lib/ai'

// POST - Generate AI reply for a keyword match
export async function POST(request: NextRequest) {
  try {
    const user = await getOrCreateUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { matchId, style, postTitle, subreddit } = body

    if (!style || !postTitle || !subreddit) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Generate the reply
    const reply = await generateReply({
      commentContent: postTitle,
      postTitle: postTitle,
      postContent: '',
      subreddit: subreddit,
      commentAuthor: 'OP',
    })

    // If matchId provided, update the match with the new suggestion
    if (matchId) {
      const match = await prisma.keywordMatch.findFirst({
        where: { id: matchId, userId: user.id },
      })

      if (match) {
        let suggestions: string[] = []
        if (match.aiSuggestions) {
          try {
            suggestions = JSON.parse(match.aiSuggestions)
          } catch {}
        }

        // Add to suggestions array based on style index
        const styleIndex = { helpful: 0, curious: 1, supportive: 2 }[style] ?? 0
        while (suggestions.length <= styleIndex) {
          suggestions.push('')
        }
        suggestions[styleIndex] = reply

        await prisma.keywordMatch.update({
          where: { id: matchId },
          data: { aiSuggestions: JSON.stringify(suggestions) },
        })
      }
    }

    return NextResponse.json({ reply, style })
  } catch (error: any) {
    console.error('[GenerateReply] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

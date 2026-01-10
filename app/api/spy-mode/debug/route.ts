import { NextRequest, NextResponse } from 'next/server'
import { getRedditClient } from '@/lib/reddit'

// Debug endpoint to test Reddit API fetch
// GET /api/spy-mode/debug?username=SomeUser
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')

    if (!username) {
      return NextResponse.json({
        error: 'Username required. Use ?username=SomeUser'
      }, { status: 400 })
    }

    const cleanUsername = username.replace(/^u\//, '').trim()
    const reddit = getRedditClient()

    // Fetch user data
    const user = await reddit.getUser(cleanUsername).fetch()
    const submissions = await reddit.getUser(cleanUsername).getSubmissions({ limit: 5 })

    return NextResponse.json({
      username: cleanUsername,
      karma: {
        link: user.link_karma,
        comment: user.comment_karma,
        total: user.total_karma,
      },
      postsFound: submissions.length,
      hasHiddenPosts: user.link_karma > 100 && submissions.length === 0,
      message: submissions.length === 0 && user.link_karma > 0
        ? 'User has karma but no visible posts. They may have hidden their post history.'
        : null,
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || 'Unknown error',
    }, { status: 500 })
  }
}

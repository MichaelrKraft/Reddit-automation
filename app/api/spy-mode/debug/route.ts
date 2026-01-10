import { NextRequest, NextResponse } from 'next/server'
import { fetchUserProfile, fetchAllUserPosts } from '@/lib/spy-mode/tracker'

// Debug endpoint to test Reddit API directly
// GET /api/spy-mode/debug?username=SomeUser
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')

    if (!username) {
      return NextResponse.json({ error: 'Username required. Use ?username=SomeUser' }, { status: 400 })
    }

    const cleanUsername = username.replace(/^u\//, '').trim()

    console.log(`[Debug] Testing Reddit fetch for: ${cleanUsername}`)

    // Fetch profile
    const profile = await fetchUserProfile(cleanUsername)
    console.log(`[Debug] Profile result:`, profile)

    if (!profile) {
      return NextResponse.json({
        success: false,
        username: cleanUsername,
        error: 'Could not fetch profile - user may not exist or is private',
        profile: null,
        posts: [],
      })
    }

    // Fetch posts
    const posts = await fetchAllUserPosts(cleanUsername, 10) // Just get 10 for testing
    console.log(`[Debug] Posts fetched: ${posts.length}`)

    if (posts.length > 0) {
      console.log(`[Debug] Sample post:`, {
        title: posts[0].title.substring(0, 50),
        subreddit: posts[0].subreddit,
        score: posts[0].score,
        redditId: posts[0].redditId,
      })
    }

    return NextResponse.json({
      success: true,
      username: cleanUsername,
      profile,
      postsFound: posts.length,
      posts: posts.map(p => ({
        title: p.title.substring(0, 100),
        subreddit: p.subreddit,
        score: p.score,
        commentCount: p.commentCount,
        postedAt: p.postedAt,
        redditId: p.redditId,
      })),
    })
  } catch (error: any) {
    console.error('[Debug] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      stack: error.stack?.split('\n').slice(0, 5),
    }, { status: 500 })
  }
}

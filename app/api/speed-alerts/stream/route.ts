import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { checkForNewPosts, generateCommentOptions, RedditPost } from '@/lib/speed-alerts'

// SSE endpoint for real-time speed alerts
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        const sendEvent = (event: string, data: any) => {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(message))
        }

        // Send initial connection confirmation
        sendEvent('connected', { message: 'Speed Alerts stream connected', userId: user.id })

        let isActive = true

        // Check for new posts every 15 seconds
        const checkAllSubreddits = async () => {
          if (!isActive) return

          try {
            // Get user's active monitored subreddits
            const monitored = await prisma.monitoredSubreddit.findMany({
              where: {
                userId: user.id,
                isActive: true,
              },
            })

            if (monitored.length === 0) {
              sendEvent('status', { message: 'No subreddits being monitored' })
              return
            }

            // Check each subreddit for new posts
            for (const sub of monitored) {
              try {
                const { newPosts, latestPostId } = await checkForNewPosts(
                  sub.subreddit,
                  sub.lastPostId
                )

                // Update last post ID if we found posts
                if (latestPostId && latestPostId !== sub.lastPostId) {
                  await prisma.monitoredSubreddit.update({
                    where: { id: sub.id },
                    data: {
                      lastPostId: latestPostId,
                      lastChecked: new Date(),
                    },
                  })
                }

                // Process new posts and generate comments
                for (const post of newPosts) {
                  const comments = await generateCommentOptions(post)

                  // Store alert in database
                  const alert = await prisma.alertHistory.create({
                    data: {
                      postId: post.id,
                      postTitle: post.title,
                      postUrl: post.url,
                      postAuthor: post.author,
                      subreddit: post.subreddit,
                      commentOptions: JSON.stringify(comments),
                      alertType: 'new_post',
                      monitoredSubredditId: sub.id,
                    },
                  })

                  // Send alert through SSE
                  sendEvent('new_post', {
                    alert: {
                      id: alert.id,
                      postId: post.id,
                      postTitle: post.title,
                      postUrl: post.url,
                      postAuthor: post.author,
                      subreddit: post.subreddit,
                      commentOptions: comments,
                      createdAt: alert.createdAt,
                    },
                  })
                }

                // Update last checked time
                await prisma.monitoredSubreddit.update({
                  where: { id: sub.id },
                  data: { lastChecked: new Date() },
                })
              } catch (subError: any) {
                console.error(`Error checking r/${sub.subreddit}:`, subError)
                sendEvent('error', {
                  subreddit: sub.subreddit,
                  message: subError.message,
                })
              }
            }

            sendEvent('heartbeat', { timestamp: new Date().toISOString() })
          } catch (error: any) {
            console.error('Error in monitoring loop:', error)
            sendEvent('error', { message: error.message })
          }
        }

        // Initial check
        await checkAllSubreddits()

        // Set up interval for subsequent checks (15 seconds)
        const intervalId = setInterval(checkAllSubreddits, 15000)

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          isActive = false
          clearInterval(intervalId)
          controller.close()
        })
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

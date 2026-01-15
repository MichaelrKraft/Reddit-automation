import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { checkForNewPosts, generateCommentOptions, RedditPost, isQuestionPost } from '@/lib/speed-alerts'
import { scoreRelevance, BusinessContext } from '@/lib/relevance-scorer'

// SSE endpoint for real-time speed alerts
export async function GET(request: NextRequest) {
  console.log('[Speed Alerts Stream] SSE connection requested')

  try {
    const user = await requireUser()
    console.log(`[Speed Alerts Stream] User authenticated: ${user.id}`)

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        const sendEvent = (event: string, data: any) => {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(message))
        }

        // Send initial connection confirmation
        console.log('[Speed Alerts Stream] Sending connected event')
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

            // Get user's business context for relevance scoring
            const businessAnalysis = await prisma.businessAnalysis.findFirst({
              where: { userId: user.id },
              orderBy: { createdAt: 'desc' },
            })

            let businessContext: BusinessContext | null = null
            if (businessAnalysis) {
              businessContext = {
                businessName: businessAnalysis.businessName || undefined,
                description: businessAnalysis.description || undefined,
                keywords: businessAnalysis.keywords ? JSON.parse(businessAnalysis.keywords) : undefined,
                painPoints: businessAnalysis.painPoints
                  ? JSON.parse(businessAnalysis.painPoints).map((p: any) => p.pain || p)
                  : undefined,
                targetAudience: businessAnalysis.targetAudience
                  ? JSON.parse(businessAnalysis.targetAudience).map((a: any) => a.segment || a)
                  : undefined,
              }
            }

            if (monitored.length === 0) {
              console.log('[Speed Alerts Stream] No subreddits being monitored')
              sendEvent('status', { message: 'No subreddits being monitored' })
              return
            }

            console.log(`[Speed Alerts Stream] Checking ${monitored.length} subreddits: ${monitored.map(m => m.subreddit).join(', ')}`)

            // Check each subreddit for new posts (with delays to avoid rate limiting)
            for (let i = 0; i < monitored.length; i++) {
              const sub = monitored[i]

              // Add delay between subreddit checks to avoid rate limiting
              if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, 2000))
              }

              try {
                const { newPosts, latestPostId } = await checkForNewPosts(
                  sub.subreddit,
                  sub.lastPostId,
                  sub.lastChecked
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

                // Filter posts based on filterMode
                let filteredPosts = newPosts
                if (sub.filterMode === 'questions') {
                  filteredPosts = newPosts.filter(post => isQuestionPost(post.title))
                  console.log(`[Speed Alerts Stream] r/${sub.subreddit}: Filtered to ${filteredPosts.length}/${newPosts.length} question posts`)
                }

                // Process filtered posts and generate comments
                for (const post of filteredPosts) {
                  const comments = await generateCommentOptions(post)

                  // Score relevance if business context is available
                  let relevanceScore: number | null = null
                  let relevanceReason: string | null = null

                  if (businessContext) {
                    try {
                      const relevanceResult = await scoreRelevance(
                        {
                          title: post.title,
                          content: post.selftext,
                          subreddit: post.subreddit,
                          author: post.author,
                        },
                        businessContext
                      )
                      relevanceScore = relevanceResult.score
                      relevanceReason = relevanceResult.reason
                      console.log(`[Speed Alerts] r/${post.subreddit}: Scored "${post.title.slice(0, 50)}..." = ${relevanceScore}%`)
                    } catch (scoreError) {
                      console.error(`[Speed Alerts] Failed to score post:`, scoreError)
                    }
                  }

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
                      relevanceScore,
                      relevanceReason,
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
                      relevanceScore,
                      relevanceReason,
                      createdAt: alert.createdAt,
                    },
                  })
                }

                // Update last checked time
                await prisma.monitoredSubreddit.update({
                  where: { id: sub.id },
                  data: { lastChecked: new Date() },
                })

                // Send status update (success - no error)
                sendEvent('status', {
                  subreddit: sub.subreddit,
                  status: 'checked',
                  newPosts: filteredPosts.length,
                  filterMode: sub.filterMode
                })
              } catch (subError: any) {
                console.error(`Error checking r/${sub.subreddit}:`, subError)
                // Don't send error events for rate limiting - it's expected
                // The next cycle will retry automatically
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

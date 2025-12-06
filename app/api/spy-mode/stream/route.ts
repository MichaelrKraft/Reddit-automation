import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkForNewPosts } from '@/lib/spy-mode/tracker'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// SSE Stream for real-time competitor activity
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || 'demo-user'

  const encoder = new TextEncoder()
  let isActive = true

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection event
      controller.enqueue(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({
            message: 'Spy Mode stream connected',
            timestamp: new Date().toISOString(),
          })}\n\n`
        )
      )

      // Poll for new posts every 30 seconds
      const pollInterval = setInterval(async () => {
        if (!isActive) {
          clearInterval(pollInterval)
          return
        }

        try {
          // Get all active tracked accounts
          const accounts = await prisma.spyAccount.findMany({
            where: { userId, isActive: true },
            select: {
              id: true,
              username: true,
              lastPostId: true,
            },
          })

          for (const account of accounts) {
            if (!isActive) break

            const { newPosts, latestPostId } = await checkForNewPosts(
              account.username,
              account.lastPostId
            )

            // Update lastPostId if changed
            if (latestPostId && latestPostId !== account.lastPostId) {
              await prisma.spyAccount.update({
                where: { id: account.id },
                data: {
                  lastPostId: latestPostId,
                  lastChecked: new Date(),
                },
              })
            }

            // Process new posts
            for (const post of newPosts) {
              // Store the post
              await prisma.spyPost.upsert({
                where: {
                  accountId_redditId: {
                    accountId: account.id,
                    redditId: post.redditId,
                  },
                },
                update: {
                  score: post.score,
                  commentCount: post.commentCount,
                },
                create: {
                  accountId: account.id,
                  redditId: post.redditId,
                  title: post.title,
                  content: post.content,
                  url: post.url,
                  subreddit: post.subreddit,
                  postType: post.postType,
                  score: post.score,
                  upvoteRatio: post.upvoteRatio,
                  commentCount: post.commentCount,
                  awards: post.awards,
                  postedAt: post.postedAt,
                },
              })

              // Create alert
              const alert = await prisma.spyAlert.create({
                data: {
                  accountId: account.id,
                  alertType: 'new_post',
                  title: `New post from u/${account.username}`,
                  description: post.title,
                  postUrl: post.url,
                  subreddit: post.subreddit,
                },
              })

              // Send SSE event
              controller.enqueue(
                encoder.encode(
                  `event: new_post\ndata: ${JSON.stringify({
                    alert: {
                      id: alert.id,
                      accountId: account.id,
                      username: account.username,
                      alertType: 'new_post',
                      postTitle: post.title,
                      postUrl: post.url,
                      subreddit: post.subreddit,
                      score: post.score,
                      createdAt: alert.createdAt.toISOString(),
                    },
                  })}\n\n`
                )
              )
            }

            // Check for viral posts (existing posts that hit 1000+ upvotes)
            const existingPosts = await prisma.spyPost.findMany({
              where: {
                accountId: account.id,
                postedAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) }, // Last 48 hours
              },
            })

            for (const existingPost of existingPosts) {
              // This would need more sophisticated tracking in production
              // For now, we'll check on-demand
            }
          }
        } catch (error) {
          console.error('Error in spy mode stream:', error)
        }
      }, 30000) // 30 seconds

      // Heartbeat every 15 seconds
      const heartbeat = setInterval(() => {
        if (!isActive) {
          clearInterval(heartbeat)
          return
        }

        try {
          controller.enqueue(
            encoder.encode(
              `event: heartbeat\ndata: ${JSON.stringify({
                timestamp: new Date().toISOString(),
              })}\n\n`
            )
          )
        } catch {
          clearInterval(heartbeat)
          clearInterval(pollInterval)
          isActive = false
        }
      }, 15000)

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        isActive = false
        clearInterval(pollInterval)
        clearInterval(heartbeat)
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
}

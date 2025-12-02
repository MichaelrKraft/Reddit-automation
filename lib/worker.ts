import { startPostWorker, startReplyWorker } from './queue'

let postWorker: any = null
let replyWorker: any = null

export function initializeWorker() {
  // Only initialize workers if Redis URL is available (runtime, not build)
  if (!postWorker && process.env.NODE_ENV !== 'test' && process.env.REDIS_URL) {
    console.log('🚀 Starting Reddit post worker...')
    postWorker = startPostWorker()

    console.log('💬 Starting Reddit reply worker...')
    replyWorker = startReplyWorker()

    process.on('SIGTERM', async () => {
      console.log('Shutting down workers...')
      await postWorker?.close()
      await replyWorker?.close()
    })
  }

  return { postWorker, replyWorker }
}

// Only auto-initialize at runtime when Redis is available
if (typeof window === 'undefined' && process.env.REDIS_URL) {
  initializeWorker()
}

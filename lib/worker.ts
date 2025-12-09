import { startPostWorker, startReplyWorker } from './queue'
import { startWarmupWorker } from './warmup-worker'
import { initializeWarmupOrchestrator } from './warmup-orchestrator'

let postWorker: any = null
let replyWorker: any = null
let warmupWorker: any = null

export function initializeWorker() {
  // Only initialize workers if Redis URL is available (runtime, not build)
  if (!postWorker && process.env.NODE_ENV !== 'test' && process.env.REDIS_URL) {
    console.log('🚀 Starting Reddit post worker...')
    postWorker = startPostWorker()

    console.log('💬 Starting Reddit reply worker...')
    replyWorker = startReplyWorker()

    console.log('🔥 Starting Reddit warmup worker...')
    warmupWorker = startWarmupWorker()

    console.log('🎯 Starting warmup orchestrator...')
    initializeWarmupOrchestrator()

    process.on('SIGTERM', async () => {
      console.log('Shutting down workers...')
      await postWorker?.close()
      await replyWorker?.close()
      await warmupWorker?.close()
    })
  }

  return { postWorker, replyWorker, warmupWorker }
}

// Only auto-initialize at runtime when Redis is available
if (typeof window === 'undefined' && process.env.REDIS_URL) {
  initializeWorker()
}

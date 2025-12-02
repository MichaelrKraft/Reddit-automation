import { startPostWorker, startReplyWorker } from './queue'

let postWorker: any = null
let replyWorker: any = null

export function initializeWorker() {
  if (!postWorker && process.env.NODE_ENV !== 'test') {
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

if (typeof window === 'undefined') {
  initializeWorker()
}

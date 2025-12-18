export async function register() {
  // Only run on the server (not edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamically import to avoid issues during build
    const { initializeWorker } = await import('./lib/worker')
    initializeWorker()
  }
}

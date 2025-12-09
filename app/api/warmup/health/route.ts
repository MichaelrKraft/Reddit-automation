import { NextRequest, NextResponse } from 'next/server'
import { getHealthMonitor } from '@/lib/warmup-health-monitor'
import { getWarmupOrchestrator } from '@/lib/warmup-orchestrator'

// GET - System health check
export async function GET(request: NextRequest) {
  try {
    const monitor = getHealthMonitor()
    const orchestrator = getWarmupOrchestrator()

    // Perform comprehensive health check
    const health = await monitor.performHealthCheck()

    // Get warmup stats
    const stats = await orchestrator.getWarmupStats()

    return NextResponse.json({
      ...health,
      stats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json(
      {
        status: 'critical',
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// POST - Clear alerts
export async function POST(request: NextRequest) {
  try {
    const monitor = getHealthMonitor()
    monitor.clearAlerts()

    return NextResponse.json({
      success: true,
      message: 'Alerts cleared',
    })
  } catch (error) {
    console.error('Error clearing alerts:', error)
    return NextResponse.json(
      { error: 'Failed to clear alerts' },
      { status: 500 }
    )
  }
}

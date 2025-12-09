import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getWarmupOrchestrator } from '@/lib/warmup-orchestrator'
import { batchCheckShadowban } from '@/lib/shadowban-detector'

// POST - Bulk operations on multiple accounts
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'demo-user'
    const { operation, accountIds, filters } = await request.json()

    if (!operation) {
      return NextResponse.json(
        { error: 'Operation is required' },
        { status: 400 }
      )
    }

    // Get accounts based on filters or IDs
    let accounts

    if (accountIds && accountIds.length > 0) {
      // Use specific account IDs
      accounts = await prisma.redditAccount.findMany({
        where: {
          id: { in: accountIds },
          userId,
        },
      })
    } else if (filters) {
      // Use filters to select accounts
      const where: any = { userId, isWarmupAccount: true }

      if (filters.status) {
        where.warmupStatus = filters.status
      }
      if (filters.minKarma !== undefined) {
        where.karma = { gte: filters.minKarma }
      }
      if (filters.maxKarma !== undefined) {
        where.karma = { ...where.karma, lte: filters.maxKarma }
      }

      accounts = await prisma.redditAccount.findMany({ where })
    } else {
      return NextResponse.json(
        { error: 'Either accountIds or filters are required' },
        { status: 400 }
      )
    }

    if (accounts.length === 0) {
      return NextResponse.json(
        { error: 'No accounts found matching criteria' },
        { status: 404 }
      )
    }

    const orchestrator = getWarmupOrchestrator()
    const results: any = {
      operation,
      totalAccounts: accounts.length,
      successful: 0,
      failed: 0,
      errors: [] as string[],
    }

    // Perform bulk operation
    switch (operation) {
      case 'start':
        for (const account of accounts) {
          try {
            await orchestrator.startAccountWarmup(account.id)
            results.successful++
          } catch (error) {
            results.failed++
            results.errors.push(
              `Failed to start ${account.username}: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
          }
        }
        break

      case 'pause':
        for (const account of accounts) {
          try {
            await orchestrator.pauseAccountWarmup(account.id)
            results.successful++
          } catch (error) {
            results.failed++
            results.errors.push(
              `Failed to pause ${account.username}: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
          }
        }
        break

      case 'resume':
        for (const account of accounts) {
          try {
            await orchestrator.resumeAccountWarmup(account.id)
            results.successful++
          } catch (error) {
            results.failed++
            results.errors.push(
              `Failed to resume ${account.username}: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
          }
        }
        break

      case 'stop':
        for (const account of accounts) {
          try {
            await orchestrator.stopAccountWarmup(account.id)
            results.successful++
          } catch (error) {
            results.failed++
            results.errors.push(
              `Failed to stop ${account.username}: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
          }
        }
        break

      case 'check_shadowban':
        const shadowbanResults = await batchCheckShadowban(
          accounts.map((a) => a.id)
        )

        results.shadowbanResults = shadowbanResults
        results.successful = Object.keys(shadowbanResults).length

        // Count how many are shadowbanned
        const shadowbanned = Object.values(shadowbanResults).filter(
          (r: any) => r.isShadowbanned
        ).length

        results.shadowbannedCount = shadowbanned

        break

      case 'reset_progress':
        // Reset warmup progress for selected accounts
        for (const account of accounts) {
          try {
            await prisma.redditAccount.update({
              where: { id: account.id },
              data: {
                warmupStatus: 'NOT_STARTED',
                warmupStartedAt: null,
                warmupCompletedAt: null,
                warmupProgress: undefined,
              },
            })
            results.successful++
          } catch (error) {
            results.failed++
            results.errors.push(
              `Failed to reset ${account.username}: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
          }
        }
        break

      default:
        return NextResponse.json(
          {
            error:
              'Invalid operation. Must be start, pause, resume, stop, check_shadowban, or reset_progress',
          },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      ...results,
      message: `Bulk operation '${operation}' completed: ${results.successful} successful, ${results.failed} failed`,
    })
  } catch (error) {
    console.error('Bulk operation failed:', error)
    return NextResponse.json(
      { error: 'Bulk operation failed' },
      { status: 500 }
    )
  }
}

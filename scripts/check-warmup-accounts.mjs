import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Get all warmup accounts
  const accounts = await prisma.redditAccount.findMany({
    where: {
      isWarmupAccount: true
    },
    select: {
      id: true,
      username: true,
      karma: true,
      warmupStatus: true,
      warmupProgress: true
    }
  })

  console.log('=== WARMUP ACCOUNTS ===\n')
  for (const acc of accounts) {
    console.log('Username:', acc.username)
    console.log('ID:', acc.id)
    console.log('Status:', acc.warmupStatus)
    console.log('Karma:', acc.karma)
    const progress = acc.warmupProgress || {}
    console.log('Banned subreddits:', progress.bannedSubreddits || [])
    console.log('Error tracking:', progress.errorTracking || 'none')
    console.log('---')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

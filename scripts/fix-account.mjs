import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Target account ID
const ACCOUNT_ID = 'cmizcftwt0007wvc5lgayaeuq'

async function main() {
  const account = await prisma.redditAccount.findUnique({
    where: { id: ACCOUNT_ID }
  })

  if (!account) {
    console.log('Account not found')
    return
  }

  console.log('Found account:', account.username)
  console.log('Current status:', account.warmupStatus)
  console.log('Current karma:', account.karma)

  const progress = account.warmupProgress || { daily: [] }

  // Mark CasualConversation as banned so it rotates to r/self
  progress.bannedSubreddits = ['CasualConversation']

  // Clear error tracking so it gets a fresh start
  delete progress.errorTracking

  // Keep failed attempts for history but start fresh
  // progress.failedAttempts = []

  await prisma.redditAccount.update({
    where: { id: ACCOUNT_ID },
    data: { warmupProgress: progress }
  })

  console.log('\n✅ Fixed! CasualConversation marked as banned')
  console.log('🔄 Next warmup will use: r/self')

  // Verify
  const updated = await prisma.redditAccount.findUnique({ where: { id: ACCOUNT_ID } })
  console.log('\nVerified banned subreddits:', updated.warmupProgress.bannedSubreddits)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

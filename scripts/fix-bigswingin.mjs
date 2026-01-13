import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const account = await prisma.redditAccount.findFirst({
    where: {
      username: {
        contains: 'bigswingin',
        mode: 'insensitive'
      }
    }
  })

  if (!account) {
    console.log('Account not found')
    return
  }

  console.log('Found account:', account.username, 'ID:', account.id)
  console.log('Current status:', account.warmupStatus)
  console.log('Current karma:', account.karma)

  const progress = account.warmupProgress || { daily: [] }
  progress.bannedSubreddits = ['CasualConversation']
  delete progress.errorTracking
  progress.failedAttempts = []

  await prisma.redditAccount.update({
    where: { id: account.id },
    data: { warmupProgress: progress }
  })

  console.log('\n✅ Updated - CasualConversation marked as banned')
  console.log('Next subreddit will be: r/self')

  const updated = await prisma.redditAccount.findUnique({ where: { id: account.id } })
  console.log('Banned subreddits:', updated?.warmupProgress?.bannedSubreddits)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

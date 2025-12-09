import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from './prisma'

const FOUNDER_LIMIT = 10 // First 10 users get founder tier

export async function getOrCreateUser() {
  const { userId } = await auth()
  if (!userId) return null

  let user = await prisma.user.findUnique({
    where: { clerkId: userId }
  })

  if (!user) {
    const clerkUser = await currentUser()
    if (!clerkUser) return null

    // Count existing users to determine signup number and tier
    const userCount = await prisma.user.count()
    const signupNumber = userCount + 1
    const tier = signupNumber <= FOUNDER_LIMIT ? 'FOUNDER' : 'ALPHA'

    user = await prisma.user.create({
      data: {
        clerkId: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        plan: 'free',
        tier: tier,
        signupNumber: signupNumber,
      }
    })
  }
  return user
}

export async function requireUser() {
  const user = await getOrCreateUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

export async function isAuthenticated() {
  const { userId } = await auth()
  return !!userId
}

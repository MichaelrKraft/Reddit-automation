import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from './prisma'

export async function getOrCreateUser() {
  const { userId } = await auth()
  if (!userId) return null

  let user = await prisma.user.findUnique({
    where: { clerkId: userId }
  })

  if (!user) {
    const clerkUser = await currentUser()
    if (!clerkUser) return null

    user = await prisma.user.create({
      data: {
        clerkId: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        plan: 'free'
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

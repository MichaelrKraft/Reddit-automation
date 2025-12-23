import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from './prisma'
import { sendWelcomeDripEmail } from './email'
import { createMauticContact } from './mautic'

const FOUNDER_LIMIT = 20 // First 20 users get founder tier

export async function getOrCreateUser() {
  const { userId } = await auth()
  if (!userId) return null

  let user = await prisma.user.findUnique({
    where: { clerkId: userId }
  })

  if (!user) {
    const clerkUser = await currentUser()
    if (!clerkUser) return null

    const email = clerkUser.emailAddresses[0]?.emailAddress || ''

    // Check if user exists by email (handles Clerk dev->prod migration)
    user = await prisma.user.findUnique({
      where: { email }
    })

    if (user) {
      // Update existing user with new Clerk ID (prod migration)
      user = await prisma.user.update({
        where: { email },
        data: { clerkId: userId }
      })
    } else {
      // Count existing users to determine signup number and tier
      const userCount = await prisma.user.count()
      const signupNumber = userCount + 1
      const tier = signupNumber <= FOUNDER_LIMIT ? 'FOUNDER' : 'ALPHA'

      user = await prisma.user.create({
        data: {
          clerkId: userId,
          email: email,
          plan: 'free',
          tier: tier,
          signupNumber: signupNumber,
        }
      })

      // Send welcome drip email to new user (async, don't block signup)
      const firstName = clerkUser.firstName || undefined
      const lastName = clerkUser.lastName || undefined
      sendWelcomeDripEmail(email, firstName).catch((err) => {
        console.error('[Auth] Failed to send welcome drip email:', err)
      })

      // Add to Mautic CRM for drip campaign enrollment (async, don't block signup)
      createMauticContact({ email, firstName, lastName }).catch((err) => {
        console.error('[Auth] Failed to create Mautic contact:', err)
      })
    }
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

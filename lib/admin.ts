import { auth } from '@clerk/nextjs/server'
import { prisma } from './prisma'

// Admin Clerk IDs from environment variable
// Set ADMIN_CLERK_IDS in .env.local as comma-separated values
// Example: ADMIN_CLERK_IDS=user_abc123,user_def456
export const ADMIN_CLERK_IDS = process.env.ADMIN_CLERK_IDS?.split(',').map(id => id.trim()) || []

/**
 * Check if a Clerk user ID has admin privileges
 */
export function isAdmin(clerkId: string): boolean {
  return ADMIN_CLERK_IDS.includes(clerkId)
}

/**
 * Check if the current authenticated user is an admin
 * Returns the user ID if admin, null otherwise
 */
export async function checkAdmin(): Promise<string | null> {
  const { userId } = await auth()
  if (!userId) return null
  return isAdmin(userId) ? userId : null
}

/**
 * Require admin access - throws error if not admin
 * Use in API routes that require admin privileges
 * Checks both env variable list AND database isAdmin flag
 */
export async function requireAdmin(): Promise<string> {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('Unauthorized: Not authenticated')
  }

  // Check both env list and database flag
  const hasAdminAccess = await isAdminUser(userId)
  if (!hasAdminAccess) {
    throw new Error('Forbidden: Admin access required')
  }

  return userId
}

/**
 * Get admin user from database
 * Returns user record if admin (env or db), null otherwise
 */
export async function getAdminUser() {
  const { userId } = await auth()
  if (!userId) return null

  // Check if user is admin via env or db
  const hasAdmin = await isAdminUser(userId)
  if (!hasAdmin) return null

  return prisma.user.findUnique({
    where: { clerkId: userId }
  })
}

/**
 * Check if user has admin flag in database
 * This is an alternative to env-based admin check
 */
export async function isDbAdmin(clerkId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { isAdmin: true }
  })
  return user?.isAdmin ?? false
}

/**
 * Combined admin check - either in env list OR has isAdmin flag in DB
 */
export async function isAdminUser(clerkId: string): Promise<boolean> {
  // First check env list (fast)
  if (isAdmin(clerkId)) return true

  // Then check database flag
  return isDbAdmin(clerkId)
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, getAdminUser } from '@/lib/admin'

// Placeholder for email sending - implement when email service is configured
async function sendAdminEmail(to: string, subject: string, html: string): Promise<boolean> {
  console.log(`[Admin Email] Would send to ${to}: ${subject}`)
  // TODO: Implement actual email sending when email service is configured
  // For now, just log and return success
  return true
}

type ActionType = 'send_email' | 'grant_lifetime' | 'revoke_lifetime' | 'toggle_admin'

interface ActionRequest {
  action: ActionType
  targetUserId: string
  data?: {
    subject?: string
    html?: string
    reason?: string
  }
}

// POST: Execute admin quick actions
export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminUser()
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body: ActionRequest = await req.json()
    const { action, targetUserId, data } = body

    if (!action || !targetUserId) {
      return NextResponse.json(
        { error: 'Missing required fields: action, targetUserId' },
        { status: 400 }
      )
    }

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let result: { success: boolean; message: string; data?: Record<string, unknown> }

    switch (action) {
      case 'send_email': {
        if (!data?.subject || !data?.html) {
          return NextResponse.json(
            { error: 'Missing email subject or html body' },
            { status: 400 }
          )
        }

        await sendAdminEmail(targetUser.email, data.subject, data.html)

        // Log the action
        await prisma.userEvent.create({
          data: {
            userId: targetUserId,
            eventType: 'admin_action',
            eventName: 'admin_email_sent',
            page: 'admin',
            metadata: {
              adminId: admin.id,
              adminEmail: admin.email,
              subject: data.subject
            }
          }
        })

        result = {
          success: true,
          message: `Email sent to ${targetUser.email}`
        }
        break
      }

      case 'grant_lifetime': {
        if (targetUser.hasLifetimeDeal) {
          return NextResponse.json(
            { error: 'User already has lifetime deal' },
            { status: 400 }
          )
        }

        await prisma.user.update({
          where: { id: targetUserId },
          data: {
            hasLifetimeDeal: true,
            lifetimePurchasedAt: new Date()
          }
        })

        // Log the action
        await prisma.userEvent.create({
          data: {
            userId: targetUserId,
            eventType: 'admin_action',
            eventName: 'lifetime_granted',
            page: 'admin',
            metadata: {
              adminId: admin.id,
              adminEmail: admin.email,
              reason: data?.reason || 'Granted by admin'
            }
          }
        })

        result = {
          success: true,
          message: `Lifetime deal granted to ${targetUser.email}`
        }
        break
      }

      case 'revoke_lifetime': {
        if (!targetUser.hasLifetimeDeal) {
          return NextResponse.json(
            { error: 'User does not have lifetime deal' },
            { status: 400 }
          )
        }

        await prisma.user.update({
          where: { id: targetUserId },
          data: {
            hasLifetimeDeal: false,
            lifetimePurchasedAt: null
          }
        })

        // Log the action
        await prisma.userEvent.create({
          data: {
            userId: targetUserId,
            eventType: 'admin_action',
            eventName: 'lifetime_revoked',
            page: 'admin',
            metadata: {
              adminId: admin.id,
              adminEmail: admin.email,
              reason: data?.reason || 'Revoked by admin'
            }
          }
        })

        result = {
          success: true,
          message: `Lifetime deal revoked from ${targetUser.email}`
        }
        break
      }

      case 'toggle_admin': {
        // Prevent removing own admin status
        if (targetUserId === admin.id) {
          return NextResponse.json(
            { error: 'Cannot modify own admin status' },
            { status: 400 }
          )
        }

        const newAdminStatus = !targetUser.isAdmin

        await prisma.user.update({
          where: { id: targetUserId },
          data: { isAdmin: newAdminStatus }
        })

        // Log the action
        await prisma.userEvent.create({
          data: {
            userId: targetUserId,
            eventType: 'admin_action',
            eventName: newAdminStatus ? 'admin_granted' : 'admin_revoked',
            page: 'admin',
            metadata: {
              adminId: admin.id,
              adminEmail: admin.email
            }
          }
        })

        result = {
          success: true,
          message: `Admin status ${newAdminStatus ? 'granted to' : 'revoked from'} ${targetUser.email}`,
          data: { isAdmin: newAdminStatus }
        }
        break
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Admin Actions] Error:', error)
    if (error instanceof Error && error.message.includes('Admin')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Failed to execute action' },
      { status: 500 }
    )
  }
}

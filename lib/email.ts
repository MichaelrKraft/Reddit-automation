/**
 * Ploink Email Client for ReddRide
 * Sends emails via the centralized Ploink email API
 */

import { Resend } from 'resend'

const PLOINK_API_URL = process.env.PLOINK_API_URL || 'http://localhost:3000';
const PLOINK_EMAIL_API_KEY = process.env.PLOINK_EMAIL_API_KEY;

// Resend for feedback notifications
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null
const FEEDBACK_NOTIFICATION_EMAIL = process.env.FEEDBACK_EMAIL || 'feedback@reddride.com'
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev'

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

interface SendTemplateOptions {
  to: string | string[];
  template: 'welcome' | 'alert' | 'transaction' | 'notification';
  variables: Record<string, any>;
  subject?: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a raw HTML email via Ploink
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  if (!PLOINK_EMAIL_API_KEY) {
    console.warn('[Email] Ploink API key not configured, skipping email');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const response = await fetch(`${PLOINK_API_URL}/api/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': PLOINK_EMAIL_API_KEY,
      },
      body: JSON.stringify({
        ...options,
        sourceApp: 'reddride',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Email] Failed to send:', data.error);
      return { success: false, error: data.error };
    }

    console.log('[Email] Sent successfully:', data.messageId);
    return { success: true, messageId: data.messageId };
  } catch (error: any) {
    console.error('[Email] Error sending email:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send a templated email via Ploink
 */
export async function sendTemplateEmail(options: SendTemplateOptions): Promise<EmailResult> {
  if (!PLOINK_EMAIL_API_KEY) {
    console.warn('[Email] Ploink API key not configured, skipping email');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const response = await fetch(`${PLOINK_API_URL}/api/email/send-template`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': PLOINK_EMAIL_API_KEY,
      },
      body: JSON.stringify({
        ...options,
        sourceApp: 'reddride',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Email] Failed to send template:', data.error);
      return { success: false, error: data.error };
    }

    console.log('[Email] Template sent successfully:', data.messageId);
    return { success: true, messageId: data.messageId };
  } catch (error: any) {
    console.error('[Email] Error sending template email:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send welcome email to new ReddRide user
 */
export async function sendWelcomeEmail(
  email: string,
  name?: string,
  tier?: string
): Promise<EmailResult> {
  return sendTemplateEmail({
    to: email,
    template: 'welcome',
    variables: {
      appName: 'ReddRide',
      name: name || undefined,
      tier: tier || undefined,
      ctaUrl: 'https://redd-rider.onrender.com/dashboard',
      ctaText: 'Go to Dashboard',
    },
  });
}

/**
 * Send alert email (e.g., shadowban detection)
 */
export async function sendAlertEmail(
  email: string,
  alertType: 'warning' | 'error' | 'success' | 'info',
  title: string,
  message: string,
  details?: string
): Promise<EmailResult> {
  return sendTemplateEmail({
    to: email,
    template: 'alert',
    variables: {
      appName: 'ReddRide',
      alertType,
      title,
      message,
      details,
      ctaUrl: 'https://redd-rider.onrender.com/dashboard',
      ctaText: 'View Dashboard',
    },
  });
}

/**
 * Send transaction/purchase confirmation email
 */
export async function sendPurchaseEmail(
  email: string,
  name?: string,
  amount?: string
): Promise<EmailResult> {
  return sendTemplateEmail({
    to: email,
    template: 'transaction',
    variables: {
      appName: 'ReddRide',
      name,
      transactionType: 'Lifetime Deal',
      amount: amount || '$29',
      items: [
        { name: 'Lifetime Access', description: 'Unlimited posts, all features forever' },
        { name: 'Founder Status', description: 'Priority support & future features' },
      ],
    },
  });
}

/**
 * Alpha Feedback Notification (via Resend)
 */
interface FeedbackEmailData {
  id: string
  type: string
  message: string
  name?: string | null
  email?: string | null
  page?: string | null
  clerkId?: string | null
  createdAt: Date
}

export async function sendFeedbackNotification(feedback: FeedbackEmailData) {
  if (!resend) {
    console.log('[Email] Resend not configured, skipping feedback notification')
    return { success: false, error: 'Resend not configured' }
  }

  const typeEmoji = {
    bug: '🐛',
    feature: '💡',
    general: '💬',
  }[feedback.type] || '📧'

  const typeLabel = feedback.type.charAt(0).toUpperCase() + feedback.type.slice(1)

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: FEEDBACK_NOTIFICATION_EMAIL,
      subject: `${typeEmoji} New ${typeLabel} Feedback - ReddRide Alpha`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #00D9FF 0%, #0891b2 100%); padding: 20px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">
              ${typeEmoji} New ${typeLabel} Feedback
            </h1>
          </div>

          <div style="background: #0a0a0f; padding: 24px; border: 1px solid #1f2937; border-top: none; border-radius: 0 0 12px 12px;">
            <div style="background: #12121a; padding: 20px; border-radius: 8px; border: 1px solid #374151; margin-bottom: 16px;">
              <p style="color: #e5e7eb; font-size: 16px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${feedback.message}</p>
            </div>

            <div style="font-size: 14px; color: #9ca3af;">
              <p style="margin: 8px 0;"><strong style="color: #00D9FF;">Type:</strong> ${typeLabel}</p>
              <p style="margin: 8px 0;"><strong style="color: #00D9FF;">Name:</strong> ${feedback.name || 'Not provided'}</p>
              <p style="margin: 8px 0;"><strong style="color: #00D9FF;">Contact Email:</strong> ${feedback.email || 'Not provided'}</p>
              <p style="margin: 8px 0;"><strong style="color: #00D9FF;">Page:</strong> ${feedback.page || 'Not specified'}</p>
              <p style="margin: 8px 0;"><strong style="color: #00D9FF;">User ID:</strong> ${feedback.clerkId || 'Anonymous'}</p>
              <p style="margin: 8px 0;"><strong style="color: #00D9FF;">Submitted:</strong> ${feedback.createdAt.toLocaleString()}</p>
              <p style="margin: 8px 0;"><strong style="color: #00D9FF;">Feedback ID:</strong> <code style="background: #1f2937; padding: 2px 6px; border-radius: 4px; color: #00D9FF;">${feedback.id}</code></p>
            </div>

            ${feedback.email ? `
            <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #374151;">
              <a href="mailto:${feedback.email}" style="display: inline-block; background: #00D9FF; color: #0a0a0f; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                Reply to User
              </a>
            </div>
            ` : ''}
          </div>

          <p style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 16px;">
            This notification was sent from ReddRide Alpha Feedback System
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('[Email] Error sending feedback notification:', error)
      return { success: false, error: error.message }
    }

    console.log('[Email] Feedback notification sent successfully:', data?.id)
    return { success: true, id: data?.id }
  } catch (err) {
    console.error('[Email] Error sending feedback notification:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

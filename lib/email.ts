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
 * Drip Campaign Email Templates
 */
const DRIP_EMAIL_TEMPLATE = (content: string, logoUrl?: string) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: #000000; padding: 25px; text-align: center; }
    .header img { max-width: 120px; height: auto; }
    .header h1 { color: #cc0000; margin: 0; font-size: 28px; font-weight: 700; }
    .content { padding: 40px 30px; }
    .content p { margin: 0 0 16px 0; font-size: 16px; }
    .content ul, .content ol { margin: 0 0 16px 0; padding-left: 24px; }
    .content li { margin-bottom: 8px; }
    .highlight-box { background: #fff5f5; border-left: 4px solid #cc0000; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
    .cta-button { display: inline-block; background: #cc0000; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .footer { background: #1a1a1a; padding: 20px 30px; text-align: center; font-size: 14px; color: #999; }
    .footer a { color: #cc0000; }
    .signature { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🐘 Redd Ride</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p style="color: #999;">Redd Ride - Grow your Reddit presence</p>
    </div>
  </div>
</body>
</html>`;

const DRIP_EMAILS = {
  welcome: {
    subject: "Welcome to Redd Ride - Let's grow your Reddit presence!",
    content: (firstName: string) => `
      <p>Hey ${firstName}!</p>
      <p>Welcome to <strong>Redd Ride</strong>! You've just joined the smartest way to grow on Reddit.</p>
      <p>Here's what you can do right now:</p>
      <div class="highlight-box">
        <p><strong>1. Connect your Reddit account</strong><br>Link your account to get started</p>
      </div>
      <div class="highlight-box">
        <p><strong>2. Start the Account Warmup</strong><br>
        New or low-karma account? Our 30-day warmup system builds your credibility safely:</p>
        <ul>
          <li>Days 1-3: Strategic upvoting</li>
          <li>Days 4-7: Helpful comments</li>
          <li>Days 8-14: First posts</li>
          <li>Days 15-30: Full activity</li>
        </ul>
        <p><em>This prevents shadowbans and gets your account trusted by Reddit's algorithm.</em></p>
      </div>
      <div class="highlight-box">
        <p><strong>3. Discover subreddits</strong><br>Find communities where your content will actually get seen</p>
      </div>
      <p style="text-align: center;">
        <a href="https://reddride.com/dashboard" class="cta-button">Go to Your Dashboard</a>
      </p>
      <p>Questions? Just reply to this email.</p>
      <div class="signature">
        <p>- The Redd Ride Team</p>
      </div>
    `,
  },
  gettingStarted: {
    subject: "Your first Reddit campaign in 5 minutes",
    content: (firstName: string) => `
      <p>Hey ${firstName},</p>
      <p>Ready to launch your first campaign? Here's how:</p>
      <ol>
        <li>Go to your dashboard</li>
        <li>Click <strong>"Create Post"</strong></li>
        <li>Let AI generate engaging content</li>
        <li>Pick your target subreddits</li>
        <li>Schedule or post immediately</li>
      </ol>
      <div class="highlight-box">
        <p><strong>Pro tip:</strong> Start with 2-3 subreddits where you've seen similar content do well.</p>
      </div>
      <p style="text-align: center;">
        <a href="https://reddride.com/dashboard" class="cta-button">Try It Now</a>
      </p>
      <div class="signature">
        <p>- Redd Ride</p>
      </div>
    `,
  },
  tips: {
    subject: "5 ways to boost your Reddit engagement",
    content: (firstName: string) => `
      <p>Hey ${firstName},</p>
      <p>After helping hundreds of Reddit marketers, here are the top 5 things that work:</p>
      <div class="highlight-box">
        <p><strong>1. Timing matters</strong><br>Post when your audience is active (Redd Ride shows you the best times)</p>
      </div>
      <div class="highlight-box">
        <p><strong>2. Value first</strong><br>80% helpful content, 20% promotional</p>
      </div>
      <div class="highlight-box">
        <p><strong>3. Engage in comments</strong><br>Reply to every comment on your posts</p>
      </div>
      <div class="highlight-box">
        <p><strong>4. Use the Spy Mode</strong><br>See what's working for competitors</p>
      </div>
      <div class="highlight-box">
        <p><strong>5. Warm up new accounts</strong><br>Our warmup feature builds credibility safely</p>
      </div>
      <p>Which one will you try first?</p>
      <p style="text-align: center;">
        <a href="https://reddride.com/dashboard" class="cta-button">Go to Dashboard</a>
      </p>
      <div class="signature">
        <p>- Redd Ride</p>
      </div>
    `,
  },
  caseStudy: {
    subject: "How Redd Ride users are getting real results",
    content: (firstName: string) => `
      <p>Hey ${firstName},</p>
      <p>Here's what's possible with consistent Reddit marketing:</p>
      <div class="highlight-box">
        <p><strong>One user went from 0 to 500 upvotes</strong> on their first viral post by:</p>
        <ul>
          <li>Using AI to match the subreddit's tone</li>
          <li>Posting at optimal times (Tuesday 9am worked best)</li>
          <li>Engaging authentically in comments</li>
        </ul>
        <p>The <strong>Spy Mode</strong> feature helped them see exactly what content format was trending.</p>
      </div>
      <p>Want similar results? The key is <strong>consistency</strong>.</p>
      <p style="text-align: center;">
        <a href="https://reddride.com/dashboard" class="cta-button">Start Here</a>
      </p>
      <div class="signature">
        <p>- Redd Ride</p>
      </div>
    `,
  },
  feature: {
    subject: "Have you tried this Redd Ride feature?",
    content: (firstName: string) => `
      <p>Hey ${firstName},</p>
      <p>Many users miss one of our most powerful features: <strong>Subreddit Discovery</strong></p>
      <p>It finds communities where YOUR content will actually get seen - not buried.</p>
      <div class="highlight-box">
        <p><strong>Here's how it works:</strong></p>
        <ol>
          <li>Tell us your niche/topic</li>
          <li>AI analyzes engagement patterns</li>
          <li>Get a ranked list of subreddits to target</li>
        </ol>
        <p>No more guessing which subreddits to post in.</p>
      </div>
      <p style="text-align: center;">
        <a href="https://reddride.com/dashboard" class="cta-button">Try Subreddit Discovery</a>
      </p>
      <div class="signature">
        <p>- Redd Ride</p>
      </div>
    `,
  },
  checkIn: {
    subject: "How's Redd Ride working for you?",
    content: (firstName: string) => `
      <p>Hey ${firstName},</p>
      <p>It's been two weeks since you joined Redd Ride. Quick check-in:</p>
      <ul>
        <li>Have you scheduled your first posts?</li>
        <li>Discovered new subreddits?</li>
        <li>Tried the AI content generator?</li>
      </ul>
      <div class="highlight-box">
        <p>If you haven't logged in recently, no worries - Reddit marketing is a marathon, not a sprint.</p>
      </div>
      <p>If you have questions or feedback, just hit reply. <strong>I read every email.</strong></p>
      <p style="text-align: center;">
        <a href="https://reddride.com/dashboard" class="cta-button">Go to Your Dashboard</a>
      </p>
      <div class="signature">
        <p>- Mike, Redd Ride Founder</p>
      </div>
    `,
  },
};

type DripEmailType = keyof typeof DRIP_EMAILS;

/**
 * Send a drip campaign email directly via Resend
 */
export async function sendDripEmail(
  to: string,
  emailType: DripEmailType,
  firstName?: string
): Promise<{ success: boolean; error?: string; id?: string }> {
  if (!resend) {
    console.log('[Email] Resend not configured, skipping drip email')
    return { success: false, error: 'Resend not configured' }
  }

  const email = DRIP_EMAILS[emailType];
  if (!email) {
    return { success: false, error: `Unknown email type: ${emailType}` };
  }

  const name = firstName || 'there';
  const html = DRIP_EMAIL_TEMPLATE(email.content(name));

  try {
    const { data, error } = await resend.emails.send({
      from: 'Redd Ride <support@reddride.com>',
      to,
      subject: email.subject,
      html,
    });

    if (error) {
      console.error(`[Email] Error sending ${emailType} drip email:`, error);
      return { success: false, error: error.message };
    }

    console.log(`[Email] Drip email ${emailType} sent successfully:`, data?.id);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error(`[Email] Error sending ${emailType} drip email:`, err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Send welcome drip email (called immediately on signup)
 */
export async function sendWelcomeDripEmail(
  email: string,
  firstName?: string
): Promise<{ success: boolean; error?: string; id?: string }> {
  return sendDripEmail(email, 'welcome', firstName);
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

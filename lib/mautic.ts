/**
 * Mautic Integration for Redd Ride
 *
 * Creates contacts directly in the dedicated Mautic instance
 * at reddride.ploink.site for enrollment in drip campaigns.
 * Uses OAuth2 client credentials flow.
 */

// Cache the access token
let cachedToken: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  const mauticUrl = process.env.MAUTIC_URL
  const clientId = process.env.MAUTIC_CLIENT_ID
  const clientSecret = process.env.MAUTIC_CLIENT_SECRET

  if (!mauticUrl || !clientId || !clientSecret) {
    throw new Error('Missing MAUTIC_URL, MAUTIC_CLIENT_ID, or MAUTIC_CLIENT_SECRET')
  }

  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token
  }

  const response = await fetch(`${mauticUrl}/oauth/v2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Mautic OAuth error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000)
  }

  return cachedToken.token
}

export async function createMauticContact(user: {
  email: string
  firstName?: string
  lastName?: string
}) {
  const mauticUrl = process.env.MAUTIC_URL

  if (!mauticUrl || !process.env.MAUTIC_CLIENT_ID || !process.env.MAUTIC_CLIENT_SECRET) {
    console.warn('[Mautic] Missing OAuth credentials, skipping contact creation')
    return null
  }

  try {
    const accessToken = await getAccessToken()

    const response = await fetch(`${mauticUrl}/api/contacts/new`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: user.email,
        firstname: user.firstName || '',
        lastname: user.lastName || '',
        tags: ['reddride-signup']
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Mautic API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log('[Mautic] Contact created successfully:', result.contact?.id)
    return result
  } catch (error) {
    console.error('[Mautic] Failed to create contact:', error)
    throw error
  }
}

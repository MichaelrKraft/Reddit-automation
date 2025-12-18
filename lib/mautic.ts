/**
 * Mautic Integration for Redd Ride
 *
 * Creates contacts directly in the dedicated Mautic instance
 * at reddride.ploink.site for enrollment in drip campaigns.
 */

export async function createMauticContact(user: {
  email: string
  firstName?: string
  lastName?: string
}) {
  const mauticUrl = process.env.MAUTIC_URL
  const mauticUser = process.env.MAUTIC_USER
  const mauticPassword = process.env.MAUTIC_PASSWORD

  if (!mauticUrl || !mauticUser || !mauticPassword) {
    console.warn('[Mautic] Missing MAUTIC_URL, MAUTIC_USER, or MAUTIC_PASSWORD, skipping contact creation')
    return null
  }

  try {
    const basicAuth = Buffer.from(`${mauticUser}:${mauticPassword}`).toString('base64')

    const response = await fetch(`${mauticUrl}/api/contacts/new`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
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

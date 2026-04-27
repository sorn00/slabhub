const GHL_API_BASE = 'https://services.leadconnectorhq.com'
const GHL_VERSION = '2021-07-28'

function getGhlConfig() {
  return {
    token: process.env.GHL_TOKEN || '',
    locationId: process.env.GHL_LOCATION_ID || 'qhOziWzmOO7mYbl3U7tm',
  }
}

function ghlHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Version: GHL_VERSION,
    'Content-Type': 'application/json',
  }
}

export async function findGhlContactByEmail(email: string): Promise<string | null> {
  const { token, locationId } = getGhlConfig()
  if (!token || !email) return null

  try {
    const res = await fetch(
      `${GHL_API_BASE}/contacts/search/duplicate?locationId=${locationId}&email=${encodeURIComponent(email)}`,
      { headers: ghlHeaders(token) }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data?.contact?.id || null
  } catch {
    return null
  }
}

export async function createGhlContact(params: {
  name?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  companyName?: string
  source: string
  tags: string[]
}): Promise<string | null> {
  const { token, locationId } = getGhlConfig()
  if (!token || !params.email) return null

  try {
    const existingId = await findGhlContactByEmail(params.email)
    if (existingId) return existingId

    const nameParts = (params.name || '').trim().split(/\s+/).filter(Boolean)
    const firstName = params.firstName || nameParts[0] || undefined
    const lastName = params.lastName || nameParts.slice(1).join(' ') || undefined
    const res = await fetch(`${GHL_API_BASE}/contacts/`, {
      method: 'POST',
      headers: ghlHeaders(token),
      body: JSON.stringify({
        locationId,
        firstName,
        lastName,
        email: params.email,
        phone: params.phone || undefined,
        companyName: params.companyName || undefined,
        source: params.source,
        tags: params.tags,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.contact?.id || null
  } catch {
    return null
  }
}

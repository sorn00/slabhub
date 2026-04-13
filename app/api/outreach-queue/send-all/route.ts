import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { auth } from '@/lib/auth'

const GHL_TOKEN = process.env.GHL_TOKEN || 'pit-73ab457e-2144-4120-9d2e-b9e408ecbea4'
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || 'qhOziWzmOO7mYbl3U7tm'
const GHL_HEADERS = {
  Authorization: `Bearer ${GHL_TOKEN}`,
  Version: '2021-07-28',
  'Content-Type': 'application/json',
}

export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const pending = await query(
    `SELECT * FROM outreach_queue WHERE status = 'pending' ORDER BY value DESC`
  )

  const results = []

  for (const item of pending) {
    try {
      // Look up GHL contact
      const contactRes = await fetch(
        `https://services.leadconnectorhq.com/contacts/?locationId=${GHL_LOCATION_ID}&limit=1&phone=${encodeURIComponent(item.phone)}`,
        { headers: GHL_HEADERS }
      )
      const contactData = await contactRes.json()
      const contactId = contactData?.contacts?.[0]?.id

      if (!contactId) {
        results.push({ id: item.id, name: item.contact_name, status: 'error: contact not found' })
        continue
      }

      // Send SMS
      const msgRes = await fetch('https://services.leadconnectorhq.com/conversations/messages', {
        method: 'POST',
        headers: GHL_HEADERS,
        body: JSON.stringify({ type: 'SMS', message: item.message, contactId }),
      })

      if (msgRes.ok) {
        await query(
          `UPDATE outreach_queue SET status = 'sent', sent_at = NOW() WHERE id = $1`,
          [item.id]
        )
        results.push({ id: item.id, name: item.contact_name, status: 'sent' })
      } else {
        results.push({ id: item.id, name: item.contact_name, status: `error: GHL ${msgRes.status}` })
      }
    } catch (e) {
      results.push({ id: item.id, name: item.contact_name, status: `error: ${String(e)}` })
    }
  }

  return NextResponse.json({ results })
}

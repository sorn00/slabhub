import { NextResponse } from 'next/server'
import { queryOne, query } from '@/lib/db'
import { auth } from '@/lib/auth'

const GHL_TOKEN = process.env.GHL_TOKEN || 'pit-73ab457e-2144-4120-9d2e-b9e408ecbea4'
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || 'qhOziWzmOO7mYbl3U7tm'
const GHL_HEADERS = {
  Authorization: `Bearer ${GHL_TOKEN}`,
  Version: '2021-07-28',
  'Content-Type': 'application/json',
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const item = await queryOne(`SELECT * FROM outreach_queue WHERE id = $1`, [parseInt(id)])
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Look up GHL contact by phone
  const contactRes = await fetch(
    `https://services.leadconnectorhq.com/contacts/?locationId=${GHL_LOCATION_ID}&limit=1&phone=${encodeURIComponent(item.phone)}`,
    { headers: GHL_HEADERS }
  )
  const contactData = await contactRes.json()
  const contactId = contactData?.contacts?.[0]?.id

  if (!contactId) {
    return NextResponse.json({ error: `GHL contact not found for ${item.phone}` }, { status: 404 })
  }

  // Send SMS via GHL
  const msgRes = await fetch('https://services.leadconnectorhq.com/conversations/messages', {
    method: 'POST',
    headers: GHL_HEADERS,
    body: JSON.stringify({ type: 'SMS', message: item.message, contactId }),
  })

  if (msgRes.ok) {
    await query(
      `UPDATE outreach_queue SET status = 'sent', sent_at = NOW() WHERE id = $1`,
      [parseInt(id)]
    )
    return NextResponse.json({ success: true })
  } else {
    const errBody = await msgRes.text()
    return NextResponse.json({ error: 'GHL send failed', status: msgRes.status, body: errBody }, { status: 400 })
  }
}

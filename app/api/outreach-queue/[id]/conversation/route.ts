import { NextResponse } from 'next/server'
import { queryOne, query } from '@/lib/db'
import { auth } from '@/lib/auth'

const GHL_TOKEN = process.env.GHL_TOKEN || 'pit-73ab457e-2144-4120-9d2e-b9e408ecbea4'
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || 'qhOziWzmOO7mYbl3U7tm'
const GHL_HEADERS = {
  Authorization: `Bearer ${GHL_TOKEN}`,
  Version: '2021-07-28',
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const item = await queryOne(`SELECT * FROM outreach_queue WHERE id = $1`, [parseInt(id)])
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Get or resolve contactId
  let contactId = item.ghl_contact_id
  if (!contactId) {
    // GHL requires query= for phone lookup (phone= param doesn't work reliably)
    const digits = item.phone.replace(/[^0-9]/g, '')
    const contactRes = await fetch(
      `https://services.leadconnectorhq.com/contacts/?locationId=${GHL_LOCATION_ID}&limit=1&query=${digits}`,
      { headers: GHL_HEADERS }
    )
    const contactData = await contactRes.json()
    contactId = contactData?.contacts?.[0]?.id
    if (contactId) {
      await query(`UPDATE outreach_queue SET ghl_contact_id = $1 WHERE id = $2`, [contactId, parseInt(id)])
    }
  }

  if (!contactId) {
    return NextResponse.json({ messages: [], error: 'Contact not found in GHL' })
  }

  // Fetch conversations for contact
  const convRes = await fetch(
    `https://services.leadconnectorhq.com/conversations/search?locationId=${GHL_LOCATION_ID}&contactId=${contactId}&limit=5`,
    { headers: GHL_HEADERS }
  )
  if (!convRes.ok) return NextResponse.json({ messages: [] })
  const convData = await convRes.json()
  const conversations = convData.conversations || []
  if (!conversations.length) return NextResponse.json({ messages: [] })

  // Fetch messages from first (most recent) conversation
  const conv = conversations[0]
  const msgRes = await fetch(
    `https://services.leadconnectorhq.com/conversations/${conv.id}/messages?limit=20`,
    { headers: { ...GHL_HEADERS, Version: '2021-04-15' } }
  )
  if (!msgRes.ok) return NextResponse.json({ messages: [] })
  const msgData = await msgRes.json()
  const rawMessages = msgData.messages?.messages || msgData.messages || []

  const messages = rawMessages.map((m: Record<string, unknown>) => ({
    direction: m.direction === 1 || m.direction === 'inbound' ? 'inbound' : 'outbound',
    body: (m.body as string) || '',
    sent_at: m.dateAdded || m.createdAt || '',
  })).filter((m: { body: string }) => m.body)

  return NextResponse.json({ messages, contactId })
}

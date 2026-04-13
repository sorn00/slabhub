import { NextRequest, NextResponse } from 'next/server'

const GHL_TOKEN = process.env.GHL_TOKEN || process.env.GHL_API_TOKEN || ''
const LOCATION_ID = process.env.GHL_LOCATION_ID || 'qhOziWzmOO7mYbl3U7tm'

async function findOrCreateContact(phone: string, name: string, email: string) {
  // Search by phone
  const search = await fetch(
    `https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${LOCATION_ID}&phone=${encodeURIComponent(phone)}`,
    { headers: { 'Authorization': `Bearer ${GHL_TOKEN}`, 'Version': '2021-07-28' } }
  )
  const data = await search.json()
  if (data?.contact?.id) return data.contact.id

  // Search by email
  if (email) {
    const emailSearch = await fetch(
      `https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${LOCATION_ID}&email=${encodeURIComponent(email)}`,
      { headers: { 'Authorization': `Bearer ${GHL_TOKEN}`, 'Version': '2021-07-28' } }
    )
    const emailData = await emailSearch.json()
    if (emailData?.contact?.id) return emailData.contact.id
  }

  // Create new contact
  const create = await fetch('https://services.leadconnectorhq.com/contacts/', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GHL_TOKEN}`, 'Version': '2021-07-28', 'Content-Type': 'application/json' },
    body: JSON.stringify({ locationId: LOCATION_ID, phone, firstName: name?.split(' ')[0] || '', lastName: name?.split(' ').slice(1).join(' ') || '', email })
  })
  const created = await create.json()
  return created?.contact?.id || null
}

async function getOrCreateConversation(contactId: string) {
  const search = await fetch(
    `https://services.leadconnectorhq.com/conversations/search?locationId=${LOCATION_ID}&contactId=${contactId}&limit=1`,
    { headers: { 'Authorization': `Bearer ${GHL_TOKEN}`, 'Version': '2021-04-15' } }
  )
  const data = await search.json()
  if (data?.conversations?.[0]?.id) return data.conversations[0].id

  // Create conversation
  const create = await fetch('https://services.leadconnectorhq.com/conversations/', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GHL_TOKEN}`, 'Version': '2021-04-15', 'Content-Type': 'application/json' },
    body: JSON.stringify({ locationId: LOCATION_ID, contactId })
  })
  const created = await create.json()
  return created?.conversation?.id || null
}

export async function POST(req: NextRequest) {
  const { phone, name, email, message, type = 'SMS' } = await req.json()

  if (!phone || !message) {
    return NextResponse.json({ error: 'phone and message required' }, { status: 400 })
  }

  try {
    const contactId = await findOrCreateContact(phone, name || '', email || '')
    if (!contactId) return NextResponse.json({ error: 'Could not find or create contact' }, { status: 500 })

    const conversationId = await getOrCreateConversation(contactId)
    if (!conversationId) return NextResponse.json({ error: 'Could not find or create conversation' }, { status: 500 })

    const send = await fetch('https://services.leadconnectorhq.com/conversations/messages', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GHL_TOKEN}`, 'Version': '2021-04-15', 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, conversationId, message })
    })
    const result = await send.json()
    if (!send.ok) return NextResponse.json({ error: result?.message || 'GHL send failed' }, { status: 500 })

    return NextResponse.json({ ok: true, messageId: result?.messageId })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { queryOne, run } from '@/lib/db'

const GHL_BASE = 'https://services.leadconnectorhq.com'
const GHL_VERSION = '2021-07-28'

function ghlHeaders() {
  return {
    Authorization: `Bearer ${process.env.GHL_TOKEN || ''}`,
    Version: GHL_VERSION,
    'Content-Type': 'application/json',
  }
}

async function sendSMS(conversationId: string, contactId: string, message: string, type = 'SMS') {
  const res = await fetch(`${GHL_BASE}/conversations/messages`, {
    method: 'POST',
    headers: ghlHeaders(),
    body: JSON.stringify({ type, conversationId, contactId, message }),
  })
  const data = await res.json()
  if (!res.ok) return { success: false, error: `GHL ${res.status}: ${JSON.stringify(data)}` }
  return { success: true, messageId: data.messageId || data.id }
}

async function getOrCreateConversation(contactId: string): Promise<string | null> {
  const locationId = process.env.GHL_LOCATION_ID || 'qhOziWzmOO7mYbl3U7tm'
  const search = await fetch(
    `${GHL_BASE}/conversations/search?contactId=${contactId}&locationId=${locationId}`,
    { headers: ghlHeaders() }
  )
  if (search.ok) {
    const data = await search.json()
    if (data?.conversations?.length) return data.conversations[0].id
  }

  const create = await fetch(`${GHL_BASE}/conversations/`, {
    method: 'POST',
    headers: ghlHeaders(),
    body: JSON.stringify({ locationId, contactId }),
  })
  if (create.ok) {
    const data = await create.json()
    return data?.conversation?.id || data?.id || null
  }
  return null
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userRole = (session.user as { role?: string }).role || 'reviewer'
  const userName = session.user?.name || session.user?.email || 'Unknown'

  const body = await req.json()
  const { status, message, notes } = body

  if (!status) {
    return NextResponse.json({ error: 'status is required' }, { status: 400 })
  }

  const validStatuses = ['pending', 'approved', 'rejected', 'edited']
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  if (status === 'approved' && !['admin', 'va'].includes(userRole)) {
    return NextResponse.json({ error: 'Only admins or VAs can approve messages' }, { status: 403 })
  }

  const { id: paramId } = await params

  const staged = await queryOne('SELECT * FROM staged_messages WHERE id = $1', [paramId]) as {
    id: string
    contact_id: string
    conversation_id: string | null
    message: string
    status: string
    channel?: string
  } | null

  if (!staged) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (status === 'approved') {
    const messageToSend = message || staged.message
    let conversationId = staged.conversation_id

    if (!conversationId) {
      conversationId = await getOrCreateConversation(staged.contact_id)
    }

    if (!conversationId) {
      return NextResponse.json({ error: 'Could not find or create GHL conversation' }, { status: 500 })
    }

    const typeMap: Record<string, string> = { SMS: 'SMS', Email: 'Email', Facebook: 'FB' }
    const ghlType = typeMap[staged.channel || 'SMS'] || 'SMS'

    const result = await sendSMS(conversationId, staged.contact_id, messageToSend, ghlType)

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to send message' }, { status: 500 })
    }

    await run(`
      UPDATE staged_messages
      SET status = 'sent',
          message = $1,
          conversation_id = $2,
          reviewed_at = NOW(),
          reviewed_by = $3,
          sent_at = NOW(),
          notes = $4
      WHERE id = $5
    `, [messageToSend, conversationId, userName, notes || null, paramId])

  } else {
    await run(`
      UPDATE staged_messages
      SET status = $1,
          message = COALESCE($2, message),
          reviewed_at = NOW(),
          reviewed_by = $3,
          notes = $4
      WHERE id = $5
    `, [status, message || null, userName, notes || null, paramId])
  }

  const updated = await queryOne('SELECT * FROM staged_messages WHERE id = $1', [paramId])
  return NextResponse.json(updated)
}

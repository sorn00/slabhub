import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { queryOne, run } from '@/lib/db'
import { sendFabricatorOutreachEmail } from '@/lib/email'

const GHL_BASE = 'https://services.leadconnectorhq.com'
const GHL_VERSION = '2021-07-28'

function ghlHeaders() {
  return {
    Authorization: `Bearer ${process.env.GHL_TOKEN || ''}`,
    Version: GHL_VERSION,
    'Content-Type': 'application/json',
  }
}

async function getOrCreateConversation(contactId: string): Promise<string | null> {
  const locationId = process.env.GHL_LOCATION_ID || 'qhOziWzmOO7mYbl3U7tm'
  const search = await fetch(`${GHL_BASE}/conversations/search?contactId=${contactId}&locationId=${locationId}`, {
    headers: ghlHeaders(),
  })
  if (search.ok) {
    const data = await search.json()
    if (data?.conversations?.length) return data.conversations[0].id
  }

  const create = await fetch(`${GHL_BASE}/conversations/`, {
    method: 'POST',
    headers: ghlHeaders(),
    body: JSON.stringify({ locationId, contactId }),
  })
  if (!create.ok) return null
  const data = await create.json()
  return data?.conversation?.id || data?.id || null
}

async function sendSms(contactId: string, conversationId: string | null, message: string) {
  const resolvedConversationId = conversationId || await getOrCreateConversation(contactId)
  if (!resolvedConversationId) return { ok: false, error: 'Could not find or create GHL conversation' }

  const res = await fetch(`${GHL_BASE}/conversations/messages`, {
    method: 'POST',
    headers: ghlHeaders(),
    body: JSON.stringify({ type: 'SMS', conversationId: resolvedConversationId, contactId, message }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { ok: false, error: `GHL ${res.status}: ${JSON.stringify(data)}` }
  return { ok: true, conversationId: resolvedConversationId }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const isAdminCookie = req.cookies.get('admin_session')?.value === 'valid'
  if (!session && !isAdminCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = isAdminCookie ? 'admin' : (session?.user as { role?: string } | undefined)?.role || 'reviewer'
  if (!['admin', 'va'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const action = body.action as 'send' | 'skip'
  const message = (body.message as string | undefined)?.trim()
  if (!['send', 'skip'].includes(action)) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  const row = await queryOne('SELECT * FROM staged_messages WHERE id = $1', [id]) as {
    id: string
    contact_id: string
    contact_name: string
    phone: string | null
    conversation_id: string | null
    message: string
    status: string
    stage_name: string
    context: string | null
    channel?: string | null
  } | null
  if (!row || !row.stage_name?.startsWith('quarriva_fabricator_')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const userName = isAdminCookie ? 'Admin' : session?.user?.name || session?.user?.email || 'Unknown'
  const finalMessage = message || row.message

  if (action === 'skip') {
    await run(
      `UPDATE staged_messages SET status = 'skipped', message = $1, reviewed_at = NOW(), reviewed_by = $2 WHERE id = $3`,
      [finalMessage, userName, id]
    )
    return NextResponse.json({ id, status: 'skipped' })
  }

  const context = row.context ? JSON.parse(row.context) as {
    email?: string
    city?: string
    claimUrl?: string
    businessName?: string
  } : {}
  const channel = row.channel || (row.stage_name === 'quarriva_fabricator_email' ? 'Email' : 'SMS')

  if (channel === 'Email') {
    if (!context.email || !context.claimUrl) {
      return NextResponse.json({ error: 'Email draft is missing email or claimUrl' }, { status: 400 })
    }
    await sendFabricatorOutreachEmail({
      to: context.email,
      businessName: context.businessName || row.contact_name,
      city: context.city || 'your area',
      claimUrl: context.claimUrl,
      message: finalMessage,
    })
    await run(
      `UPDATE staged_messages SET status = 'sent', message = $1, reviewed_at = NOW(), reviewed_by = $2, sent_at = NOW() WHERE id = $3`,
      [finalMessage, userName, id]
    )
    return NextResponse.json({ id, status: 'sent' })
  }

  const result = await sendSms(row.contact_id, row.conversation_id, finalMessage)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })

  await run(
    `UPDATE staged_messages SET status = 'sent', message = $1, conversation_id = COALESCE($2, conversation_id), reviewed_at = NOW(), reviewed_by = $3, sent_at = NOW() WHERE id = $4`,
    [finalMessage, result.conversationId || null, userName, id]
  )
  return NextResponse.json({ id, status: 'sent' })
}

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { run } from '@/lib/db'

const GHL_API_BASE = 'https://services.leadconnectorhq.com'
const GHL_TOKEN = process.env.GHL_TOKEN || ''
const GHL_VERSION = '2021-07-28'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const {
    contactId,
    conversationId,
    message,
    phone,
    contactName,
    stageName,
    priority,
    action, // 'stage' | 'send'
    confirmed, // must be true to actually send
  } = body

  if (!message || !contactId) {
    return NextResponse.json({ error: 'contactId and message are required' }, { status: 400 })
  }

  // Default action: stage for review
  const effectiveAction = action || 'stage'

  // SEND path — requires confirmed=true
  if (effectiveAction === 'send') {
    if (!confirmed) {
      return NextResponse.json({
        requiresConfirmation: true,
        message: 'Please confirm before sending this message via SMS.',
        preview: message,
      }, { status: 200 })
    }

    // Look up conversation ID if not provided
    let resolvedConvId = conversationId
    if (!resolvedConvId) {
      try {
        const convSearch = await fetch(
          `${GHL_API_BASE}/conversations/search?locationId=qhOziWzmOO7mYbl3U7tm&contactId=${contactId}&limit=1`,
          { headers: { Authorization: `Bearer ${GHL_TOKEN}`, Version: '2021-04-15' } }
        )
        const convData = await convSearch.json()
        resolvedConvId = convData.conversations?.[0]?.id
      } catch {}
    }

    if (!resolvedConvId) {
      return NextResponse.json({ error: 'Could not find conversation for this contact' }, { status: 400 })
    }

    try {
      const ghlBody = JSON.stringify({
        type: 'SMS',
        conversationId: resolvedConvId,
        contactId,
        message,
      })

      const ghlRes = await fetch(`${GHL_API_BASE}/conversations/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GHL_TOKEN}`,
          Version: GHL_VERSION,
          'Content-Type': 'application/json',
        },
        body: ghlBody,
      })

      if (!ghlRes.ok) {
        const errData = await ghlRes.json().catch(() => ({}))
        return NextResponse.json(
          { error: `GHL send failed: ${ghlRes.status}`, detail: errData },
          { status: 500 }
        )
      }

      const result = await ghlRes.json()
      const userName = session.user?.name || session.user?.email || 'Unknown'

      // Log to staged_messages as 'sent'
      try {
        await run(`
          INSERT INTO staged_messages (contact_id, contact_name, phone, conversation_id, message, status, stage_name, created_at, reviewed_at, reviewed_by, sent_at)
          VALUES ($1, $2, $3, $4, $5, 'sent', $6, NOW(), NOW(), $7, NOW())
        `, [contactId, contactName || '', phone || '', resolvedConvId, message, stageName || priority || '', userName])
      } catch {
        // Non-fatal
      }

      return NextResponse.json({ success: true, messageId: result?.id || result?.messageId })
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 500 })
    }
  }

  // STAGE path — save to staged_messages for review
  try {
    const userName = session.user?.name || session.user?.email || 'Unknown'
    const context = priority ? `Priority: ${priority}` : ''

    const row = await run(`
      INSERT INTO staged_messages (contact_id, contact_name, phone, conversation_id, message, status, stage_name, context, created_at)
      VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, NOW())
      RETURNING id
    `, [
      contactId,
      contactName || '',
      phone || '',
      conversationId || '',
      message,
      stageName || '',
      context,
    ])

    return NextResponse.json({ success: true, staged: true, id: (row as { id?: string })?.id })
  } catch (err) {
    console.error('stage message error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

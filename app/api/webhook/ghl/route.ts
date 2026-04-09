import { NextRequest, NextResponse } from 'next/server'
import { run } from '@/lib/db'
import { randomUUID } from 'crypto'

// ── Constants ─────────────────────────────────────────────────────────────────
const GHL_TOKEN = 'pit-73ab457e-2144-4120-9d2e-b9e408ecbea4'
const GHL_LOC = 'qhOziWzmOO7mYbl3U7tm'
const TELEGRAM_TOKEN = '8505355085:AAHvIPt6KPoRosDoYavhObjhsylK_qp96Q4'
const TELEGRAM_CHAT = '5027057965'

// ── Telegram ──────────────────────────────────────────────────────────────────
async function sendTelegram(msg: string) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT, text: msg }),
    })
  } catch (err) {
    console.error('Telegram send error:', err)
  }
}

// ── GHL helpers ───────────────────────────────────────────────────────────────
async function getContact(id: string) {
  const r = await fetch(`https://services.leadconnectorhq.com/contacts/${id}`, {
    headers: { Authorization: `Bearer ${GHL_TOKEN}`, Version: '2021-07-28' },
  })
  return r.json()
}

async function getMessages(convId: string, limit = 10) {
  const r = await fetch(
    `https://services.leadconnectorhq.com/conversations/${convId}/messages?limit=${limit}`,
    { headers: { Authorization: `Bearer ${GHL_TOKEN}`, Version: '2021-04-15' } }
  )
  const d = await r.json()
  return d.messages?.messages || []
}

async function isDnd(contactId: string): Promise<boolean> {
  try {
    const c = await getContact(contactId)
    const tags: string[] = c?.contact?.tags || c?.tags || []
    return tags.some((t: string) => t.toLowerCase() === 'dnd')
  } catch {
    return false
  }
}

// ── Channel resolver ──────────────────────────────────────────────────────────
function resolveReplyChannel(lastMessages: unknown[]): 'SMS' | 'Facebook' | 'SMS+Email' {
  const lastInbound = lastMessages.find((m: unknown) => (m as Record<string, unknown>).direction === 'inbound')
  if (!lastInbound) return 'SMS'
  const t = (
    ((lastInbound as Record<string, unknown>).messageType || (lastInbound as Record<string, unknown>).type || '') as string
  ).toString().toLowerCase()
  if (t.includes('fb') || t.includes('facebook')) return 'Facebook'
  if (t.includes('email') || t === 'lc_email') return 'SMS+Email'
  return 'SMS'
}

// ── Context-aware SMS draft (< 160 chars) ─────────────────────────────────────
function buildSmsDraft(firstName: string, messages: unknown[]): string {
  const first = firstName || 'there'
  const allText = messages
    .map((m: unknown) => ((m as Record<string, unknown>).body || (m as Record<string, unknown>).message || '') as string)
    .join(' ')
    .toLowerCase()

  const hasAttachment = messages.some((m: unknown) => {
    const meta = (m as Record<string, unknown>).attachments || (m as Record<string, unknown>).files
    return Array.isArray(meta) && meta.length > 0
  })

  if (hasAttachment) {
    return `Hi ${first}! Thanks for sending that over — reviewing now and will follow up shortly!`
  }
  if (/\d+\s*(sq|sqft|square|ft|inch|"|\')/.test(allText) || /measurements|dimensions/.test(allText)) {
    return `Hi ${first}! Got it, reviewing your details now and will get back to you shortly 😊`
  }
  if (/quote|price|cost|how much/.test(allText)) {
    return `Hi ${first}! To get you a quote, could you share rough measurements and what material you're leaning toward? 😊`
  }
  if (/quartz|granite|marble|quartzite/.test(allText)) {
    return `Hi ${first}! Great choice! Could you share the dimensions of the space? Even rough measurements work 😊`
  }
  if (/appointment|showroom|visit|come in|stop by/.test(allText)) {
    return `Hi ${first}! Absolutely — we'd love to have you in. What day/time works best?`
  }
  if (/hello|hi |hey |good morning|good afternoon/.test(allText)) {
    return `Hi ${first}! Thanks for reaching out 😊 What area are you updating and do you have a material in mind?`
  }
  return `Hi ${first}! Thanks for your message — I'll get back to you shortly 😊`
}

// ── Save staged message ────────────────────────────────────────────────────────
async function saveStaged(params: {
  contactId: string
  contactName: string
  phone: string
  conversationId: string | null
  message: string
  channel: string
  stageName: string
  notes?: string
}) {
  const id = randomUUID()
  await run(
    `INSERT INTO staged_messages
      (id, contact_id, contact_name, phone, conversation_id, message, status, stage_name, channel, created_at, notes)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, NOW(), $9)`,
    [
      id,
      params.contactId,
      params.contactName,
      params.phone,
      params.conversationId || null,
      params.message,
      params.stageName,
      params.channel,
      params.notes || null,
    ]
  )
  return id
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const { type, locationId } = body as { type?: string; locationId?: string }

  // Only process our location
  if (locationId && locationId !== GHL_LOC) {
    return NextResponse.json({ ok: true })
  }

  console.log(`[GHL webhook] type=${type}`)

  try {
    // ── ContactCreate ─────────────────────────────────────────────────────────
    if (type === 'ContactCreate') {
      await run(
        `INSERT INTO webhook_events (event_type, contact_id, payload, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [type, body.id, JSON.stringify(body)]
      )
      // Log only — no draft, no Telegram
      return NextResponse.json({ ok: true })
    }

    // ── InboundMessage ────────────────────────────────────────────────────────
    if (type === 'InboundMessage') {
      const contactId = body.contactId as string
      const conversationId = body.conversationId as string | undefined
      const msgId = ((body.messageId || body.id || `${contactId}-${Date.now()}`) as string)
      const rawBody = ((body.message || body.body || '') as string)
      const msgType = ((body.messageType || 'SMS') as string)

      // 1. Save to webhook_events
      await run(
        `INSERT INTO webhook_events (event_type, contact_id, conversation_id, payload, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [type, contactId, conversationId || null, JSON.stringify(body)]
      )

      // 2. Save to messages table
      if (contactId) {
        try {
          await run(
            `INSERT INTO messages (id, contact_id, conversation_id, direction, body, message_type, sent_at)
             VALUES ($1, $2, $3, 'inbound', $4, $5, NOW())
             ON CONFLICT (id) DO NOTHING`,
            [msgId, contactId, conversationId || null, rawBody, msgType]
          )
        } catch (e) {
          console.error('Failed to save to messages:', e)
        }
      }

      // 3. Check DND
      if (await isDnd(contactId)) {
        console.log(`[GHL webhook] Contact ${contactId} is DND — skipping draft`)
        return NextResponse.json({ ok: true })
      }

      // 4. Fetch last 10 messages
      const lastMessages = conversationId ? await getMessages(conversationId, 10) : []

      // 5. Resolve channel
      const channel = resolveReplyChannel(lastMessages)

      // 6. Get contact info
      const contactData = await getContact(contactId)
      const contact = contactData?.contact || contactData
      const firstName = (contact?.firstName || body.firstName || '') as string
      const lastName = (contact?.lastName || body.lastName || '') as string
      const phone = (contact?.phone || body.phone || '') as string
      const name = `${firstName} ${lastName}`.trim() || phone || 'Unknown'

      // 7. Generate and save draft(s)
      if (channel === 'Facebook') {
        const draft = buildSmsDraft(firstName, lastMessages.length ? lastMessages : [body])
        await saveStaged({
          contactId,
          contactName: name,
          phone,
          conversationId: conversationId || null,
          message: draft,
          channel: 'Facebook',
          stageName: 'InboundMessage',
        })
      } else if (channel === 'SMS+Email') {
        // Email draft — handoff note
        const emailDraft = `Hi ${firstName || name}! Thanks for reaching out about your countertop project. I'd love to help — I'll send you a quick text now so we can keep things moving easily! Best, Arts Marble & Granite`
        await saveStaged({
          contactId,
          contactName: name,
          phone,
          conversationId: conversationId || null,
          message: emailDraft,
          channel: 'Email',
          stageName: 'InboundMessage',
          notes: 'Email handoff — bridge to SMS',
        })
        // SMS draft
        const smsDraft = buildSmsDraft(firstName, lastMessages.length ? lastMessages : [body])
        await saveStaged({
          contactId,
          contactName: name,
          phone,
          conversationId: conversationId || null,
          message: smsDraft,
          channel: 'SMS',
          stageName: 'InboundMessage',
        })
      } else {
        // SMS
        const smsDraft = buildSmsDraft(firstName, lastMessages.length ? lastMessages : [body])
        await saveStaged({
          contactId,
          contactName: name,
          phone,
          conversationId: conversationId || null,
          message: smsDraft,
          channel: 'SMS',
          stageName: 'InboundMessage',
        })
      }

      // 8. Telegram alert
      const displayChannel = channel === 'SMS+Email' ? 'Email+SMS' : channel
      await sendTelegram(
        `💬 ${name} replied via ${displayChannel} — draft ready\nquarriva.com/crm/messages`
      )

      return NextResponse.json({ ok: true })
    }

    // ── OutboundMessage ───────────────────────────────────────────────────────
    if (type === 'OutboundMessage') {
      const contactId = body.contactId as string
      const conversationId = body.conversationId as string | undefined
      const msgId = ((body.messageId || body.id || `${contactId}-${Date.now()}`) as string)
      const rawBody = ((body.message || body.body || '') as string)
      const msgType = ((body.messageType || 'SMS') as string)

      if (contactId) {
        try {
          await run(
            `INSERT INTO messages (id, contact_id, conversation_id, direction, body, message_type, sent_at)
             VALUES ($1, $2, $3, 'outbound', $4, $5, NOW())
             ON CONFLICT (id) DO NOTHING`,
            [msgId, contactId, conversationId || null, rawBody, msgType]
          )
        } catch (e) {
          console.error('Failed to save outbound message:', e)
        }
      }
      return NextResponse.json({ ok: true })
    }

    // ── OpportunityCreate ─────────────────────────────────────────────────────
    if (type === 'OpportunityCreate') {
      const contactId = (body.contactId || (body.contact as Record<string, unknown>)?.id) as string | undefined

      // 1. Save to webhook_events
      await run(
        `INSERT INTO webhook_events (event_type, contact_id, payload, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [type, contactId || null, JSON.stringify(body)]
      )

      if (!contactId) return NextResponse.json({ ok: true })

      // 2. Fetch contact
      const contactData = await getContact(contactId)
      const contact = contactData?.contact || contactData
      const firstName = (contact?.firstName || '') as string
      const lastName = (contact?.lastName || '') as string
      const phone = (contact?.phone || '') as string
      const name = `${firstName} ${lastName}`.trim() || phone || 'Unknown'

      // 3. Draft intro SMS
      const introDraft = `Hi ${firstName || name}! Thanks for your interest in Arts Marble & Granite 😊 What area are you looking to update, and do you have a material in mind?`

      // 4. Save to staged_messages
      await saveStaged({
        contactId,
        contactName: name,
        phone,
        conversationId: null,
        message: introDraft,
        channel: 'SMS',
        stageName: 'OpportunityCreate',
      })

      // 5. Telegram
      await sendTelegram(
        `🆕 New opportunity: ${name} (${phone || 'no phone'}) — intro drafted\nquarriva.com/crm/messages`
      )

      return NextResponse.json({ ok: true })
    }

    // ── OpportunityStageUpdate ────────────────────────────────────────────────
    if (type === 'OpportunityStageUpdate') {
      const contactId = (body.contactId || (body.contact as Record<string, unknown>)?.id) as string | undefined
      const stageName = ((body.stage as Record<string, unknown>)?.name || body.stageName || body.newStage || '') as string

      // 1. Save to webhook_events
      await run(
        `INSERT INTO webhook_events (event_type, contact_id, payload, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [type, contactId || null, JSON.stringify(body)]
      )

      if (!contactId || !stageName) return NextResponse.json({ ok: true })

      // Get contact info
      const contactData = await getContact(contactId)
      const contact = contactData?.contact || contactData
      const firstName = (contact?.firstName || '') as string
      const lastName = (contact?.lastName || '') as string
      const phone = (contact?.phone || '') as string
      const name = `${firstName} ${lastName}`.trim() || phone || 'Unknown'
      const first = firstName || name

      const stageNorm = stageName.toLowerCase()
      let draftMsg: string | null = null

      if (stageNorm.includes('quote sent')) {
        draftMsg = `Hi ${first}! Just checking in — did you get a chance to review your quote? Happy to answer any questions 😊`
      } else if (stageNorm.includes('sketch') || stageNorm.includes('measurement')) {
        draftMsg = `Hi ${first}! We received your sketch/measurements — thank you! We'll review and get back to you soon 😊`
      } else if (stageNorm.includes('waiting')) {
        draftMsg = `Hi ${first}! Just wanted to check in and see if you have any questions. We're here to help! 😊`
      }

      if (draftMsg) {
        await saveStaged({
          contactId,
          contactName: name,
          phone,
          conversationId: null,
          message: draftMsg,
          channel: 'SMS',
          stageName: `OpportunityStageUpdate:${stageName}`,
        })
      }

      // 3. Telegram
      await sendTelegram(`📋 Stage update: ${name} → ${stageName}`)

      return NextResponse.json({ ok: true })
    }

    // ── NoteCreate ────────────────────────────────────────────────────────────
    if (type === 'NoteCreate') {
      const contactId = body.contactId as string | undefined
      const noteBody = ((body.body || body.note || '') as string).toLowerCase()

      // 1. Save to webhook_events
      await run(
        `INSERT INTO webhook_events (event_type, contact_id, payload, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [type, contactId || null, JSON.stringify(body)]
      )

      // 2. Check for call-related keywords
      const callKeywords = ['no answer', 'voicemail', 'called', 'left message', 'tried calling']
      const isCallNote = callKeywords.some((k) => noteBody.includes(k))

      if (isCallNote && contactId) {
        const contactData = await getContact(contactId)
        const contact = contactData?.contact || contactData
        const firstName = (contact?.firstName || '') as string
        const lastName = (contact?.lastName || '') as string
        const phone = (contact?.phone || '') as string
        const name = `${firstName} ${lastName}`.trim() || phone || 'Unknown'
        const first = firstName || name

        const draftMsg = `Hi ${first}! We tried reaching you — just wanted to follow up on your countertop project. Feel free to reply here anytime 😊`

        await saveStaged({
          contactId,
          contactName: name,
          phone,
          conversationId: null,
          message: draftMsg,
          channel: 'SMS',
          stageName: 'NoteCreate:CallFollowUp',
          notes: `Note: ${(body.body as string || '').substring(0, 100)}`,
        })

        await sendTelegram(`📝 Note created for ${name} — call follow-up drafted\nquarriva.com/crm/messages`)
      }

      return NextResponse.json({ ok: true })
    }

    // ── TaskComplete ──────────────────────────────────────────────────────────
    if (type === 'TaskComplete') {
      // Log only
      try {
        await run(
          `INSERT INTO webhook_events (event_type, contact_id, payload, created_at)
           VALUES ($1, $2, $3, NOW())`,
          [type, (body.contactId as string) || null, JSON.stringify(body)]
        )
      } catch (e) {
        console.error('TaskComplete log error:', e)
      }
      return NextResponse.json({ ok: true })
    }

    // ── ConversationUnread ────────────────────────────────────────────────────
    if (type === 'ConversationUnread') {
      const contactId = body.contactId as string | undefined
      const convId = body.conversationId as string | undefined

      await run(
        `INSERT INTO webhook_events (event_type, contact_id, conversation_id, payload, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [type, contactId || null, convId || null, JSON.stringify(body)]
      )

      // Get name for alert
      let displayName = 'Unknown'
      if (contactId) {
        try {
          const contactData = await getContact(contactId)
          const c = contactData?.contact || contactData
          const fn = (c?.firstName || '') as string
          const ln = (c?.lastName || '') as string
          displayName = `${fn} ${ln}`.trim() || (c?.phone as string) || 'Unknown'
        } catch {
          // Use default
        }
      }

      await sendTelegram(`📬 Unread: ${displayName}`)
      return NextResponse.json({ ok: true })
    }

    // ── Unknown event type — log silently ─────────────────────────────────────
    console.log(`[GHL webhook] Unhandled type: ${type}`)
  } catch (err) {
    console.error('[GHL webhook] Processing error:', err)
    // Return 200 to prevent GHL retries
  }

  return NextResponse.json({ ok: true })
}

// GET for GHL webhook verification / health check
export async function GET() {
  return NextResponse.json({ ok: true, service: 'quarriva-webhook' })
}

import { NextRequest, NextResponse } from 'next/server'
import { run } from '@/lib/db'

const GHL_TOKEN = 'pit-73ab457e-2144-4120-9d2e-b9e408ecbea4'
const GHL_LOC = 'qhOziWzmOO7mYbl3U7tm'
const TELEGRAM_TOKEN = '8505355085:AAHvIPt6KPoRosDoYavhObjhsylK_qp96Q4'
const TELEGRAM_CHAT = '5027057965'

async function tg(msg: string) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT, text: msg, parse_mode: 'HTML' }),
    })
  } catch {}
}

async function ghlGet(path: string) {
  const r = await fetch(`https://services.leadconnectorhq.com${path}`, {
    headers: { Authorization: `Bearer ${GHL_TOKEN}`, Version: '2021-07-28' },
  })
  return r.json()
}

async function getContact(id: string) {
  return ghlGet(`/contacts/${id}`)
}

async function getMessages(convId: string, limit = 10) {
  const r = await fetch(
    `https://services.leadconnectorhq.com/conversations/${convId}/messages?limit=${limit}`,
    { headers: { Authorization: `Bearer ${GHL_TOKEN}`, Version: '2021-04-15' } }
  )
  const d = await r.json()
  return (d.messages?.messages || []) as any[]
}

async function isDnd(contactId: string): Promise<boolean> {
  const c = await getContact(contactId)
  const tags: string[] = c?.contact?.tags || c?.tags || []
  return tags.some((t: string) => t.toLowerCase() === 'dnd')
}

function channelFromType(t: string): string {
  t = t.toLowerCase()
  if (t.includes('fb') || t.includes('facebook')) return 'Facebook'
  if (t.includes('email') || t === 'lc_email') return 'Email'
  return 'SMS'
}

function resolveChannel(messages: any[], contact: any): string {
  // If prior messages exist, match last inbound channel
  const lastInbound = messages.find((m: any) => m.direction === 'inbound')
  if (lastInbound) {
    return channelFromType(lastInbound.messageType || lastInbound.type || '')
  }
  // No prior messages — use contact info priority
  const c = contact?.contact || contact || {}
  const source = (c.source || '').toLowerCase()
  if (source.includes('facebook') || c.facebookId) return 'Facebook'
  if (c.phone) return 'SMS'
  return 'Email'
}

function generateSmsDraft(firstName: string, messages: any[], eventType: string): string {
  const inbound = messages.filter((m: any) => m.direction === 'inbound')
  const lastMsg = (inbound[0]?.body || '').toLowerCase()
  const hasAttachment = messages.some((m: any) => m.attachments?.length > 0)

  if (hasAttachment)
    return `Hi ${firstName}! Thanks for sending that over — reviewing now and will follow up shortly! 😊`
  if (/measurement|dimension|sqft|square\s*f/i.test(lastMsg))
    return `Hi ${firstName}! Got it, reviewing your details now and will get back to you shortly 😊`
  if (/quote|price|cost|how much/i.test(lastMsg))
    return `Hi ${firstName}! To get you a quote, could you share rough measurements and what material you're leaning toward? 😊`
  if (/quartz|granite|marble|quartzite/i.test(lastMsg))
    return `Hi ${firstName}! Great choice! Could you share the dimensions of the space? Even rough measurements work 😊`
  if (/appointment|showroom|visit|come in/i.test(lastMsg))
    return `Hi ${firstName}! Absolutely — we'd love to have you in. What day/time works best?`
  if (/hello|hi |interested|looking for/i.test(lastMsg) || eventType === 'OpportunityCreate')
    return `Hi ${firstName}! Thanks for reaching out 😊 What area are you updating and do you have a material in mind?`
  if (eventType === 'OpportunityStageUpdate')
    return `Hi ${firstName}! Just checking in on your countertop project — any questions I can answer? 😊`
  return `Hi ${firstName}! Thanks for your message — I'll get back to you shortly 😊`
}

async function stageMessage(
  contactId: string,
  convId: string | null,
  contactName: string,
  phone: string | null,
  message: string,
  channel: string,
  eventType: string
) {
  await run(
    `INSERT INTO staged_messages (contact_id, conversation_id, contact_name, phone, message, channel, status, context, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, NOW())`,
    [contactId, convId, contactName, phone, message, channel, JSON.stringify({ eventType, source: 'webhook-auto' })]
  )
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false })
  }

  const { type, locationId } = body as any
  if (locationId && locationId !== GHL_LOC) return NextResponse.json({ ok: true })

  try {
    // Always log to webhook_events
    const logTypes = [
      'InboundMessage', 'OutboundMessage', 'OpportunityCreate', 'OpportunityStageUpdate',
      'NoteCreate', 'ContactCreate', 'TaskComplete', 'ConversationUnread',
    ]
    if (logTypes.includes(type as string)) {
      await run(
        `INSERT INTO webhook_events (event_type, contact_id, conversation_id, payload, created_at) VALUES ($1, $2, $3, $4, NOW())`,
        [type, body.contactId || body.id, body.conversationId, JSON.stringify(body)]
      ).catch(() => {})
    }

    // ContactCreate — log only, no draft, no alert
    if (type === 'ContactCreate') {
      return NextResponse.json({ ok: true })
    }

    // Save message to messages table
    if (type === 'InboundMessage' || type === 'OutboundMessage') {
      const b = body as any
      if (b.contactId) {
        const msgId = (b.messageId || b.id || `${b.contactId}-${Date.now()}`) as string
        await run(
          `INSERT INTO messages (id, contact_id, conversation_id, direction, body, message_type, sent_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW()) ON CONFLICT (id) DO NOTHING`,
          [
            msgId,
            b.contactId,
            b.conversationId || null,
            type === 'InboundMessage' ? 'inbound' : 'outbound',
            b.message || b.body || '',
            b.messageType || 'SMS',
          ]
        ).catch(() => {})
      }
    }

    // InboundMessage — main auto-draft flow
    if (type === 'InboundMessage') {
      const b = body as any
      const contactId = b.contactId
      if (!contactId) return NextResponse.json({ ok: true })

      // DND check
      if (await isDnd(contactId)) return NextResponse.json({ ok: true })

      // Get contact + conversation history
      const [contactData, messages] = await Promise.all([
        getContact(contactId),
        b.conversationId ? getMessages(b.conversationId, 10) : Promise.resolve([]),
      ])

      const c = contactData?.contact || contactData || {}
      const firstName = c.firstName || b.firstName || 'there'
      const contactName = `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unknown'
      const phone = c.phone || b.phone || null

      const channel = resolveChannel(messages, contactData)
      const smsDraft = generateSmsDraft(firstName, messages, type)

      if (channel === 'Facebook') {
        // Facebook — single FB draft
        await stageMessage(contactId, b.conversationId, contactName, phone, smsDraft, 'Facebook', type)
      } else if (channel === 'Email' && phone) {
        // Email lead with phone — stage email handoff + SMS (main)
        const emailHandoff = `Hi ${firstName}!\n\nThanks for reaching out about your countertop project. I'd love to help — I'll send you a quick text now so we can keep things moving easily!\n\nBest,\nArts Marble & Granite`
        await stageMessage(contactId, b.conversationId, contactName, phone, emailHandoff, 'Email', type)
        await stageMessage(contactId, b.conversationId, contactName, phone, smsDraft, 'SMS', type)
      } else if (channel === 'Email') {
        // Email only — no phone, no FB
        const emailDraft = `Hi ${firstName}!\n\nThanks for reaching out about your countertop project. We'd love to help!\n\nCould you share what area you're updating, what material you're considering, and your rough dimensions?\n\nBest,\nArts Marble & Granite`
        await stageMessage(contactId, b.conversationId, contactName, phone, emailDraft, 'Email', type)
      } else {
        // SMS
        await stageMessage(contactId, b.conversationId, contactName, phone, smsDraft, 'SMS', type)
      }

      const msgPreview = (b.message || b.body || '').substring(0, 120)
      await tg(
        `💬 <b>${contactName}</b> replied via ${channel}\n📱 ${phone || 'no phone'}\n\n"${msgPreview}"\n\n<a href="https://quarriva.com/crm/messages">→ Review draft</a>`
      )
      return NextResponse.json({ ok: true })
    }

    // OpportunityCreate
    if (type === 'OpportunityCreate') {
      const b = body as any
      const contactId = b.contactId
      if (!contactId) return NextResponse.json({ ok: true })

      const contactData = await getContact(contactId)
      const c = contactData?.contact || contactData || {}
      const firstName = c.firstName || 'there'
      const contactName = `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unknown'
      const phone = c.phone || null
      const channel = c.phone ? 'SMS' : 'Email'

      const draft = `Hi ${firstName}! Thanks for reaching out 😊 What area are you looking to update and do you have a material in mind?`
      await stageMessage(contactId, null, contactName, phone, draft, channel, type)
      await tg(
        `🆕 <b>New Opportunity</b>\n${contactName}\n📱 ${phone || 'no phone'}\n\n<a href="https://quarriva.com/crm/messages">→ Intro draft ready</a>`
      )
      return NextResponse.json({ ok: true })
    }

    // OpportunityStageUpdate
    if (type === 'OpportunityStageUpdate') {
      const b = body as any
      const stage = b.stage?.name || b.stageName || b.newStage || ''
      const contactId = b.contactId
      await tg(`📋 Stage update: ${b.contactName || 'Lead'} → <b>${stage}</b>`)

      if (contactId && stage) {
        const contactData = await getContact(contactId)
        const c = contactData?.contact || contactData || {}
        const firstName = c.firstName || 'there'
        const contactName = `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unknown'
        const phone = c.phone || null

        let draft = ''
        if (stage.toLowerCase().includes('quote sent'))
          draft = `Hi ${firstName}! Just checking in — did you get a chance to review the quote? Happy to answer any questions! 😊`
        else if (stage.toLowerCase().includes('sketch') || stage.toLowerCase().includes('measurement'))
          draft = `Hi ${firstName}! Got your measurements — thank you! I'll review and follow up with options shortly 😊`
        else if (stage.toLowerCase().includes('waiting'))
          draft = `Hi ${firstName}! Just following up on your countertop project — any questions I can help with? 😊`

        if (draft)
          await stageMessage(contactId, null, contactName, phone, draft, phone ? 'SMS' : 'Email', type)
      }
      return NextResponse.json({ ok: true })
    }

    // NoteCreate
    if (type === 'NoteCreate') {
      const b = body as any
      const noteBody = (b.body || b.note || '').toLowerCase()
      if (/no answer|voicemail|called|left message/i.test(noteBody)) {
        const contactId = b.contactId
        if (contactId) {
          const contactData = await getContact(contactId)
          const c = contactData?.contact || contactData || {}
          const firstName = c.firstName || 'there'
          const contactName = `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unknown'
          const phone = c.phone || null
          const draft = `Hi ${firstName}! I tried reaching you by phone — feel free to text back here when you get a chance! 😊`
          await stageMessage(contactId, null, contactName, phone, draft, 'SMS', type)
          await tg(`📞 Note: tried calling ${contactName} — SMS draft staged`)
        }
      }
      return NextResponse.json({ ok: true })
    }

    // ConversationUnread
    if (type === 'ConversationUnread') {
      const b = body as any
      await tg(
        `📬 Unread conversation: ${b.contactName || b.firstName || 'Lead'}\n<a href="https://quarriva.com/crm/messages">→ View</a>`
      )
      return NextResponse.json({ ok: true })
    }
  } catch (err) {
    console.error('Webhook error:', err)
  }

  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'quarriva-webhook' })
}

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { run } from '@/lib/db'

const GHL_TOKEN = 'pit-73ab457e-2144-4120-9d2e-b9e408ecbea4'
const LOC_ID = 'qhOziWzmOO7mYbl3U7tm'

function ghlHeaders() {
  return { Authorization: `Bearer ${GHL_TOKEN}`, Version: '2021-04-15' }
}

function channelLabel(type: string): string {
  if (!type) return 'SMS'
  if (type.includes('FB') || type.includes('FACEBOOK')) return 'FB'
  if (type.includes('EMAIL')) return 'Email'
  if (type.includes('PHONE') || type.includes('SMS')) return 'SMS'
  return 'SMS'
}

interface GhlMessage {
  id?: string
  body?: string
  direction?: number | string
  dateAdded?: string | number
  messageType?: string | number
  type?: string | number
  [key: string]: unknown
}

async function fetchAllConversationsForContact(contactId: string) {
  const searchRes = await fetch(
    `https://services.leadconnectorhq.com/conversations/search?locationId=${LOC_ID}&contactId=${contactId}&limit=20`,
    { headers: ghlHeaders() }
  )
  if (!searchRes.ok) return []
  const searchData = await searchRes.json()
  return searchData.conversations || []
}

async function fetchAndSaveAllMessages(contactId: string, limit = 50) {
  const conversations = await fetchAllConversationsForContact(contactId)
  if (!conversations.length) return { messages: [], conversations: [] }

  // Fetch messages from all conversations in parallel
  const allMessages = await Promise.all(
    conversations.map(async (conv: { id: string; type: string }) => {
      try {
        const msgRes = await fetch(
          `https://services.leadconnectorhq.com/conversations/${conv.id}/messages?limit=${limit}`,
          { headers: ghlHeaders() }
        )
        if (!msgRes.ok) return []
        const msgData = await msgRes.json()
        const msgs: GhlMessage[] = msgData.messages?.messages || []

        // Save to DB + tag with channelType
        for (const m of msgs) {
          const body = (m.body as string) || ''
          if (!body.trim()) continue
          if (body.includes('Opportunity')) continue

          const id = (m.id as string) || `${contactId}-${m.dateAdded}`
          const direction = (m.direction === 1 || m.direction === 'inbound') ? 'inbound' : 'outbound'
          const sentAt = m.dateAdded
            ? new Date(m.dateAdded as string | number).toISOString()
            : new Date().toISOString()
          const msgType = String(m.messageType || m.type || conv.type || 'SMS')

          try {
            await run(
              `INSERT INTO messages (id, contact_id, conversation_id, direction, body, message_type, sent_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (id) DO NOTHING`,
              [id, contactId, conv.id, direction, body, msgType, sentAt]
            )
          } catch {
            // ignore individual insert errors
          }
        }

        // Return tagged messages
        return msgs
          .filter((m) => {
            const body = (m.body as string) || ''
            return body.trim() && !body.includes('Opportunity')
          })
          .map((m) => ({
            id: (m.id as string) || `${contactId}-${m.dateAdded}`,
            body: m.body,
            direction: (m.direction === 1 || m.direction === 'inbound') ? 'inbound' : 'outbound',
            sent_at: m.dateAdded
              ? new Date(m.dateAdded as string | number).toISOString()
              : new Date().toISOString(),
            conversation_id: conv.id,
            channelType: conv.type,
            channelLabel: channelLabel(conv.type),
          }))
      } catch {
        return []
      }
    })
  )

  // Flatten and sort oldest → newest
  const merged = allMessages
    .flat()
    .sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime())

  return {
    messages: merged,
    conversations: conversations.map((c: { id: string; type: string }) => ({
      id: c.id,
      type: c.type,
      label: channelLabel(c.type),
    })),
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const contactId = searchParams.get('contactId')
  const conversationId = searchParams.get('conversationId')
  const refresh = searchParams.get('refresh') === 'true'
  const since = searchParams.get('since')

  if (!contactId && !conversationId) {
    return NextResponse.json({ error: 'contactId or conversationId required' }, { status: 400 })
  }

  try {
    // Resolve contactId — if only conversationId given, we'll use it as a single-conversation fallback
    const resolvedContactId = contactId || ''

    if (resolvedContactId) {
      // Full multi-channel merge for contactId
      const { messages, conversations } = await fetchAndSaveAllMessages(
        resolvedContactId,
        refresh ? 50 : 50
      )

      if (refresh && since) {
        const newCount = messages.filter(
          (m) => m.sent_at && new Date(m.sent_at) > new Date(since)
        ).length
        return NextResponse.json({ messages, conversations, newCount, source: 'ghl-all-refresh' })
      }

      return NextResponse.json({ messages, conversations, source: 'ghl-all' })
    }

    // Fallback: single conversationId (legacy path) — fetch just that one conversation
    const msgRes = await fetch(
      `https://services.leadconnectorhq.com/conversations/${conversationId}/messages?limit=50`,
      { headers: ghlHeaders() }
    )
    if (!msgRes.ok) return NextResponse.json({ messages: [], source: 'error' })
    const msgData = await msgRes.json()
    const rawMsgs: GhlMessage[] = msgData.messages?.messages || []

    const messages = rawMsgs
      .filter((m) => {
        const body = (m.body as string) || ''
        return body.trim() && !body.includes('Opportunity')
      })
      .map((m) => ({
        id: (m.id as string) || `${conversationId}-${m.dateAdded}`,
        body: m.body,
        direction: (m.direction === 1 || m.direction === 'inbound') ? 'inbound' : 'outbound',
        sent_at: m.dateAdded
          ? new Date(m.dateAdded as string | number).toISOString()
          : new Date().toISOString(),
        conversation_id: conversationId,
        channelType: 'TYPE_PHONE',
        channelLabel: 'SMS',
      }))
      .sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime())

    return NextResponse.json({
      messages,
      conversations: [{ id: conversationId, type: 'TYPE_PHONE', label: 'SMS' }],
      source: 'ghl-single',
    })
  } catch (err) {
    console.error('Conversation fetch error:', err)
    return NextResponse.json({ messages: [], source: 'error' })
  }
}

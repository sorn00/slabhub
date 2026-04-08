import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { query, run } from '@/lib/db'

const GHL_TOKEN = 'pit-73ab457e-2144-4120-9d2e-b9e408ecbea4'
const LOC_ID = 'qhOziWzmOO7mYbl3U7tm'

async function ghlHeaders() {
  return { Authorization: `Bearer ${GHL_TOKEN}`, Version: '2021-04-15' }
}

async function fetchAndSaveGhlMessages(convId: string, contactId: string, limit = 20) {
  const msgsRes = await fetch(
    `https://services.leadconnectorhq.com/conversations/${convId}/messages?limit=${limit}`,
    { headers: await ghlHeaders() }
  )
  if (!msgsRes.ok) return []
  const msgsData = await msgsRes.json()
  const rawMsgs: Record<string, unknown>[] = msgsData.messages?.messages || []

  let saved = 0
  for (const m of rawMsgs) {
    const body = (m.body as string) || ''
    if (!body.trim()) continue
    if (body.includes('Opportunity')) continue

    const id = (m.id as string) || `${contactId}-${m.dateAdded}`
    const direction = (m.direction === 1 || m.direction === 'inbound') ? 'inbound' : 'outbound'
    const sentAt = m.dateAdded ? new Date(m.dateAdded as string | number).toISOString() : new Date().toISOString()
    const msgType = String(m.messageType || m.type || 'SMS')

    try {
      await run(
        `INSERT INTO messages (id, contact_id, conversation_id, direction, body, message_type, sent_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [id, contactId, convId, direction, body, msgType, sentAt]
      )
      saved++
    } catch {
      // ignore individual insert errors
    }
  }
  return rawMsgs
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const contactId = searchParams.get('contactId')
  const conversationId = searchParams.get('conversationId')
  const refresh = searchParams.get('refresh') === 'true'
  const since = searchParams.get('since') // ISO timestamp of last known message

  if (!contactId && !conversationId) {
    return NextResponse.json({ error: 'contactId or conversationId required' }, { status: 400 })
  }

  try {
    // Always load from local DB first
    const localMessages = contactId
      ? await query(
          `SELECT id, direction, body, sent_at, conversation_id
           FROM messages WHERE contact_id = $1
           ORDER BY sent_at ASC LIMIT 20`,
          [contactId]
        )
      : await query(
          `SELECT id, direction, body, sent_at, conversation_id
           FROM messages WHERE conversation_id = $1
           ORDER BY sent_at ASC LIMIT 20`,
          [conversationId]
        )

    // If refresh=true, poll GHL for new messages
    if (refresh) {
      let convId = conversationId
      const resolvedContactId = contactId || localMessages[0]?.contact_id || ''

      if (!convId && contactId) {
        const searchRes = await fetch(
          `https://services.leadconnectorhq.com/conversations/search?locationId=${LOC_ID}&contactId=${contactId}&limit=1`,
          { headers: await ghlHeaders() }
        )
        const searchData = await searchRes.json()
        convId = searchData.conversations?.[0]?.id
      }

      if (!convId) {
        return NextResponse.json({ messages: localMessages, source: 'local', newCount: 0 })
      }

      const ghlMsgs = await fetchAndSaveGhlMessages(convId, resolvedContactId, 10)

      // Count how many are newer than `since`
      const newCount = since
        ? ghlMsgs.filter((m) => {
            const added = m.dateAdded as string | number | undefined
            return added && new Date(added) > new Date(since)
          }).length
        : ghlMsgs.length

      // Return fresh from DB
      const refreshed = resolvedContactId
        ? await query(
            `SELECT id, direction, body, sent_at, conversation_id
             FROM messages WHERE contact_id = $1
             ORDER BY sent_at ASC LIMIT 20`,
            [resolvedContactId]
          )
        : await query(
            `SELECT id, direction, body, sent_at, conversation_id
             FROM messages WHERE conversation_id = $1
             ORDER BY sent_at ASC LIMIT 20`,
            [convId]
          )

      return NextResponse.json({ messages: refreshed, newCount, source: 'ghl-refresh' })
    }

    // Local messages found — return them
    if (localMessages.length > 0) {
      return NextResponse.json({ messages: localMessages, source: 'local' })
    }

    // No local messages — one-time backfill from GHL
    let convId = conversationId
    const resolvedContactId = contactId || ''

    if (!convId && contactId) {
      const searchRes = await fetch(
        `https://services.leadconnectorhq.com/conversations/search?locationId=${LOC_ID}&contactId=${contactId}&limit=1`,
        { headers: await ghlHeaders() }
      )
      const searchData = await searchRes.json()
      convId = searchData.conversations?.[0]?.id
    }

    if (!convId) {
      return NextResponse.json({ messages: [], source: 'no-conversation' })
    }

    await fetchAndSaveGhlMessages(convId, resolvedContactId, 20)

    const backfilled = resolvedContactId
      ? await query(
          `SELECT id, direction, body, sent_at, conversation_id
           FROM messages WHERE contact_id = $1
           ORDER BY sent_at ASC LIMIT 20`,
          [resolvedContactId]
        )
      : await query(
          `SELECT id, direction, body, sent_at, conversation_id
           FROM messages WHERE conversation_id = $1
           ORDER BY sent_at ASC LIMIT 20`,
          [convId]
        )

    return NextResponse.json({ messages: backfilled, conversationId: convId, source: 'ghl-backfill' })
  } catch (err) {
    console.error('Conversation fetch error:', err)
    return NextResponse.json({ messages: [], source: 'error' })
  }
}

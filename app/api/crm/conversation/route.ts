import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const GHL_TOKEN = 'pit-73ab457e-2144-4120-9d2e-b9e408ecbea4'
const LOC_ID = 'qhOziWzmOO7mYbl3U7tm'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const contactId = searchParams.get('contactId')
  const conversationId = searchParams.get('conversationId')

  if (!contactId && !conversationId) {
    return NextResponse.json({ error: 'contactId or conversationId required' }, { status: 400 })
  }

  try {
    let convId = conversationId

    // If no conversationId, search by contactId
    if (!convId && contactId) {
      const searchRes = await fetch(
        `https://services.leadconnectorhq.com/conversations/search?locationId=${LOC_ID}&contactId=${contactId}&limit=1`,
        { headers: { Authorization: `Bearer ${GHL_TOKEN}`, Version: '2021-04-15' } }
      )
      const searchData = await searchRes.json()
      convId = searchData.conversations?.[0]?.id
    }

    if (!convId) {
      return NextResponse.json({ messages: [] })
    }

    // Fetch last 10 messages
    const msgsRes = await fetch(
      `https://services.leadconnectorhq.com/conversations/${convId}/messages?limit=10`,
      { headers: { Authorization: `Bearer ${GHL_TOKEN}`, Version: '2021-04-15' } }
    )
    const msgsData = await msgsRes.json()
    const messages = (msgsData.messages?.messages || [])
      .filter((m: { body?: string }) => m.body && m.body.trim() && !m.body.includes('Opportunity'))
      .reverse()
      .map((m: { direction: string; body: string; dateAdded: string | number }) => ({
        direction: m.direction,
        body: m.body,
        sent_at: m.dateAdded,
      }))

    return NextResponse.json({ messages, conversationId: convId })
  } catch (err) {
    console.error('Conversation fetch error:', err)
    return NextResponse.json({ messages: [] })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { sendGhlMessage, getOrCreateConversation } from '@/lib/ghl-api'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userRole = (session.user as { role?: string }).role || 'reviewer'
  if (userRole !== 'admin') {
    return NextResponse.json({ error: 'Only admins can send messages directly' }, { status: 403 })
  }

  const body = await req.json()
  const { contactId, conversationId: convId, message, stagedMessageId } = body

  if (!contactId || !message) {
    return NextResponse.json({ error: 'contactId and message are required' }, { status: 400 })
  }

  let conversationId = convId
  if (!conversationId) {
    conversationId = await getOrCreateConversation(contactId)
  }

  if (!conversationId) {
    return NextResponse.json({ error: 'Could not find or create conversation' }, { status: 500 })
  }

  const result = await sendGhlMessage({ conversationId, message })

  if (!result.success) {
    return NextResponse.json({ error: result.error || 'GHL send failed' }, { status: 500 })
  }

  // Update staged message if provided
  if (stagedMessageId) {
    const db = getDb()
    const userName = session.user?.name || session.user?.email || 'Unknown'
    db.prepare(`
      UPDATE staged_messages
      SET status = 'sent',
          sent_at = datetime('now'),
          reviewed_at = datetime('now'),
          reviewed_by = ?
      WHERE id = ?
    `).run(userName, stagedMessageId)
  }

  return NextResponse.json({ success: true, messageId: result.messageId })
}

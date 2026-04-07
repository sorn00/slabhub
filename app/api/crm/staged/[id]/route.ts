import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { sendGhlMessage, getOrCreateConversation } from '@/lib/ghl-api'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
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

  // Only admins can approve
  if (status === 'approved' && userRole !== 'admin') {
    return NextResponse.json({ error: 'Only admins can approve messages' }, { status: 403 })
  }

  const db = getDb()
  const staged = db.prepare('SELECT * FROM staged_messages WHERE id = ?').get(params.id) as {
    id: string
    contact_id: string
    conversation_id: string | null
    message: string
    status: string
  } | undefined

  if (!staged) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // If approving, send via GHL immediately
  if (status === 'approved') {
    const messageToSend = message || staged.message
    let conversationId = staged.conversation_id

    if (!conversationId) {
      conversationId = await getOrCreateConversation(staged.contact_id)
    }

    if (!conversationId) {
      return NextResponse.json({ error: 'Could not find or create GHL conversation' }, { status: 500 })
    }

    const result = await sendGhlMessage({
      conversationId,
      message: messageToSend,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to send message' }, { status: 500 })
    }

    db.prepare(`
      UPDATE staged_messages
      SET status = 'sent',
          message = ?,
          conversation_id = ?,
          reviewed_at = datetime('now'),
          reviewed_by = ?,
          sent_at = datetime('now'),
          notes = ?
      WHERE id = ?
    `).run(messageToSend, conversationId, userName, notes || null, params.id)
  } else {
    db.prepare(`
      UPDATE staged_messages
      SET status = ?,
          message = COALESCE(?, message),
          reviewed_at = datetime('now'),
          reviewed_by = ?,
          notes = ?
      WHERE id = ?
    `).run(status, message || null, userName, notes || null, params.id)
  }

  const updated = db.prepare('SELECT * FROM staged_messages WHERE id = ?').get(params.id)
  return NextResponse.json(updated)
}

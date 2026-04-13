import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { queryOne, run } from '@/lib/db'
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

  // Admins and VAs can approve
  if (status === 'approved' && !['admin', 'va'].includes(userRole)) {
    return NextResponse.json({ error: 'Only admins or VAs can approve messages' }, { status: 403 })
  }

  const staged = await queryOne('SELECT * FROM staged_messages WHERE id = $1', [params.id]) as {
    id: string
    contact_id: string
    conversation_id: string | null
    message: string
    status: string
  } | null

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

    // Route by channel
    const typeMap: Record<string, string> = {
      SMS: 'SMS',
      Email: 'Email',
      Facebook: 'FB',
    }
    const stagedChannel = (staged as unknown as Record<string, unknown>).channel as string | undefined
    const ghlType = typeMap[stagedChannel || 'SMS'] || 'SMS'

    const result = await sendGhlMessage({
      conversationId,
      contactId: staged.contact_id,
      message: messageToSend,
      type: ghlType,
    })

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
    `, [messageToSend, conversationId, userName, notes || null, params.id])
  } else {
    await run(`
      UPDATE staged_messages
      SET status = $1,
          message = COALESCE($2, message),
          reviewed_at = NOW(),
          reviewed_by = $3,
          notes = $4
      WHERE id = $5
    `, [status, message || null, userName, notes || null, params.id])
  }

  const updated = await queryOne('SELECT * FROM staged_messages WHERE id = $1', [params.id])
  return NextResponse.json(updated)
}

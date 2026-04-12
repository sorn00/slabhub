import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { query, run } from '@/lib/db'

// GET — fetch all messages for a quote request
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const quoteId = parseInt(params.id)

  // Verify this quote belongs to this user (or admin check via email)
  const isAdmin = session.user.email === process.env.ADMIN_EMAIL || session.user.role === 'admin'

  if (!isAdmin) {
    const owner = await query(
      `SELECT id FROM quote_requests WHERE id = $1 AND user_id = $2`,
      [quoteId, session.user.id]
    )
    if (!owner.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const messages = await query(
    `SELECT id, sender, body, created_at, read_at FROM quote_messages
     WHERE quote_request_id = $1 ORDER BY created_at ASC`,
    [quoteId]
  )

  // Mark user messages as read if admin is viewing, and vice versa
  const markSender = isAdmin ? 'user' : 'admin'
  await run(
    `UPDATE quote_messages SET read_at = NOW()
     WHERE quote_request_id = $1 AND sender = $2 AND read_at IS NULL`,
    [quoteId, markSender]
  )

  return NextResponse.json({ messages })
}

// POST — send a message
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const quoteId = parseInt(params.id)
  const { body } = await req.json()
  if (!body?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 })

  const isAdmin = session.user.email === process.env.ADMIN_EMAIL || session.user.role === 'admin'
  const sender = isAdmin ? 'admin' : 'user'

  if (!isAdmin) {
    const owner = await query(
      `SELECT id FROM quote_requests WHERE id = $1 AND user_id = $2`,
      [quoteId, session.user.id]
    )
    if (!owner.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await run(
    `INSERT INTO quote_messages (quote_request_id, sender, body) VALUES ($1, $2, $3)`,
    [quoteId, sender, body.trim()]
  )

  // Update quote status to 'in_review' if it was pending and admin replied
  if (isAdmin) {
    await run(
      `UPDATE quote_requests SET status = 'in_review' WHERE id = $1 AND status = 'pending'`,
      [quoteId]
    )
  }

  return NextResponse.json({ ok: true })
}

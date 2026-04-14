import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { query, run } from '@/lib/db'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function checkAdmin(session: any) {
  return session?.user?.email === process.env.ADMIN_EMAIL ||
    session?.user?.role === 'admin'
}

// GET — fetch all messages for a quote request
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: paramId } = await params
  const quoteId = parseInt(paramId)
  const isAdmin = checkAdmin(session)

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

  // Mark opposite side messages as read
  const markSender = isAdmin ? 'user' : 'admin'
  await run(
    `UPDATE quote_messages SET read_at = NOW()
     WHERE quote_request_id = $1 AND sender = $2 AND read_at IS NULL`,
    [quoteId, markSender]
  )

  return NextResponse.json({ messages })
}

// POST — send a message
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: paramId2 } = await params
  const quoteId = parseInt(paramId2)
  const { body } = await req.json()
  if (!body?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 })

  const isAdmin = checkAdmin(session)
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

  if (isAdmin) {
    await run(
      `UPDATE quote_requests SET status = 'in_review' WHERE id = $1 AND status = 'pending'`,
      [quoteId]
    )
  }

  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const db = getDb()
  let query = 'SELECT * FROM staged_messages'
  const params: string[] = []

  if (status) {
    query += ' WHERE status = ?'
    params.push(status)
  }

  query += ' ORDER BY created_at ASC'

  const rows = db.prepare(query).all(...params)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const {
    contact_id,
    contact_name,
    phone,
    conversation_id,
    message,
    stage_name,
    context,
    notes,
  } = body

  if (!contact_id || !message) {
    return NextResponse.json({ error: 'contact_id and message are required' }, { status: 400 })
  }

  const id = randomUUID()
  const db = getDb()

  db.prepare(`
    INSERT INTO staged_messages (
      id, contact_id, contact_name, phone, conversation_id,
      message, status, stage_name, context, created_at, notes
    ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, datetime('now'), ?)
  `).run(
    id, contact_id, contact_name, phone, conversation_id,
    message, stage_name, context ? JSON.stringify(context) : null, notes
  )

  const row = db.prepare('SELECT * FROM staged_messages WHERE id = ?').get(id)
  return NextResponse.json(row, { status: 201 })
}

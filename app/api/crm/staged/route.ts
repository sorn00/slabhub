import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { query, run, queryOne } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let sql = 'SELECT * FROM staged_messages'
  const params: string[] = []

  if (status) {
    sql += ' WHERE status = $1'
    params.push(status)
  }

  sql += ' ORDER BY created_at ASC'

  const rows = await query(sql, params.length ? params : undefined)
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

  await run(`
    INSERT INTO staged_messages (
      id, contact_id, contact_name, phone, conversation_id,
      message, status, stage_name, context, created_at, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, NOW(), $9)
  `, [
    id, contact_id, contact_name, phone, conversation_id,
    message, stage_name, context ? JSON.stringify(context) : null, notes
  ])

  const row = await queryOne('SELECT * FROM staged_messages WHERE id = $1', [id])
  return NextResponse.json(row, { status: 201 })
}

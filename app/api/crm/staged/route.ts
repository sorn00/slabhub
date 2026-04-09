import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { query, run, queryOne } from '@/lib/db'
import { randomUUID } from 'crypto'

const GHL_TOKEN = process.env.GHL_API_TOKEN || 'pit-73ab457e-2144-4120-9d2e-b9e408ecbea4'

async function isContactDnd(contactId: string): Promise<boolean> {
  try {
    const res = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
      headers: {
        Authorization: `Bearer ${GHL_TOKEN}`,
        Version: '2021-07-28',
      },
    })
    if (!res.ok) return false
    const data = await res.json()
    const contact = data.contact || data
    const tags: string[] = contact.tags || []
    return tags.map((t: string) => t.toLowerCase()).includes('dnd')
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const contactId = searchParams.get('contactId')

  // GET /api/crm/staged?contactId=xxx — return pending staged messages for a specific contact
  if (contactId) {
    const rows = await query(
      'SELECT * FROM staged_messages WHERE contact_id = $1 AND status = $2 ORDER BY created_at DESC',
      [contactId, 'pending']
    )
    return NextResponse.json(rows)
  }

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
    channel,
    stage_name,
    context,
    notes,
  } = body

  if (!contact_id || !message) {
    return NextResponse.json({ error: 'contact_id and message are required' }, { status: 400 })
  }

  // Check DND before staging
  const dnd = await isContactDnd(contact_id)
  if (dnd) {
    return NextResponse.json(
      { error: 'Contact is marked DND — message not staged', dnd: true },
      { status: 422 }
    )
  }

  const id = randomUUID()

  await run(`
    INSERT INTO staged_messages (
      id, contact_id, contact_name, phone, conversation_id,
      message, status, channel, stage_name, context, created_at, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9, NOW(), $10)
  `, [
    id, contact_id, contact_name, phone, conversation_id,
    message, channel || 'SMS', stage_name, context ? JSON.stringify(context) : null, notes
  ])

  const row = await queryOne('SELECT * FROM staged_messages WHERE id = $1', [id])
  return NextResponse.json(row, { status: 201 })
}

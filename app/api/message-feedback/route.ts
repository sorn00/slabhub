import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { query, run } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message_id, source, contact_name, stage_name, message, rating, feedback_text } = await req.json()

  if (!message_id || !rating || !['good', 'bad'].includes(rating)) {
    return NextResponse.json({ error: 'message_id and rating (good|bad) required' }, { status: 400 })
  }

  const user = session.user?.email || 'unknown'

  // Upsert — one rating per message per user
  await run(`
    INSERT INTO message_feedback (message_id, source, contact_name, stage_name, message, rating, feedback_text, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT DO NOTHING
  `, [message_id, source || 'unknown', contact_name || null, stage_name || null, message || null, rating, feedback_text || null, user])

  return NextResponse.json({ success: true })
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const rating = searchParams.get('rating') // 'good' | 'bad' | null = all
  const limit = parseInt(searchParams.get('limit') || '50')

  const rows = await query(
    `SELECT * FROM message_feedback
     ${rating ? `WHERE rating = $1` : ''}
     ORDER BY created_at DESC
     LIMIT ${rating ? '$2' : '$1'}`,
    rating ? [rating, limit] : [limit]
  )

  return NextResponse.json({ feedback: rows })
}

import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const queueItems = await query(
    `SELECT id::text AS id, contact_name, phone, stage AS stage_name, value, message, status, created_at,
     NULL::text AS contact_id, NULL::text AS conversation_id, NULL::text AS context, 'outreach_queue' AS source
     FROM outreach_queue WHERE status = 'pending' ORDER BY value DESC, created_at ASC`
  )
  const stagedItems = await query(
    `SELECT id, contact_name, phone, stage_name, 0 AS value, message, status, created_at,
     contact_id, conversation_id, context, 'staged_messages' AS source
     FROM staged_messages WHERE status = 'pending' ORDER BY created_at ASC`
  )
  return NextResponse.json({ queue: [...queueItems, ...stagedItems] })
}

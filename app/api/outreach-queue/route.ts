import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const queue = await query(
    `SELECT * FROM outreach_queue WHERE status = 'pending' ORDER BY value DESC, created_at ASC`
  )
  return NextResponse.json({ queue })
}

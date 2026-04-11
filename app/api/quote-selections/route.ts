import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { run, query } from '@/lib/db'

// GET — fetch all saved stones for current user
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const rows = await query(
    `SELECT stone_id, stone_name, image_url, added_at, status
     FROM quote_selections WHERE user_id = $1 AND status = 'saved'
     ORDER BY added_at DESC`,
    [session.user.id]
  )
  return NextResponse.json({ stones: rows })
}

// POST — add a stone to saved selections
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { stone_id, stone_name, image_url } = await req.json()
  if (!stone_id || !stone_name) {
    return NextResponse.json({ error: 'stone_id and stone_name required' }, { status: 400 })
  }
  await run(
    `INSERT INTO quote_selections (user_id, stone_id, stone_name, image_url, status)
     VALUES ($1, $2, $3, $4, 'saved')
     ON CONFLICT (user_id, stone_id) DO UPDATE SET status = 'saved', added_at = NOW()`,
    [session.user.id, stone_id, stone_name, image_url || null]
  )
  return NextResponse.json({ ok: true })
}

// DELETE — remove a stone from saved selections
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { stone_id } = await req.json()
  await run(
    `DELETE FROM quote_selections WHERE user_id = $1 AND stone_id = $2`,
    [session.user.id, stone_id]
  )
  return NextResponse.json({ ok: true })
}

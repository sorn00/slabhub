import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getDb()
  const favorites = db.prepare(
    'SELECT * FROM favorites WHERE user_id = ? ORDER BY created_at DESC'
  ).all(session.user.id)

  return NextResponse.json(favorites)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { stone_id, stone_name, stone_image, stone_material, stone_price_range } = await req.json()
  if (!stone_id) {
    return NextResponse.json({ error: 'stone_id required' }, { status: 400 })
  }

  const db = getDb()
  try {
    const result = db.prepare(
      `INSERT OR IGNORE INTO favorites (user_id, stone_id, stone_name, stone_image, stone_material, stone_price_range)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(session.user.id, stone_id, stone_name, stone_image, stone_material, stone_price_range)

    return NextResponse.json({ added: result.changes > 0 })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { stone_id } = await req.json()
  if (!stone_id) {
    return NextResponse.json({ error: 'stone_id required' }, { status: 400 })
  }

  const db = getDb()
  const result = db.prepare(
    'DELETE FROM favorites WHERE user_id = ? AND stone_id = ?'
  ).run(session.user.id, stone_id)

  return NextResponse.json({ removed: result.changes > 0 })
}

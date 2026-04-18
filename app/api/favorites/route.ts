import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { query, run } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const favorites = await query(
    `SELECT f.*, COALESCE(s.slug, f.stone_id) AS stone_slug
     FROM favorites f
     LEFT JOIN stones s ON s.id::text = f.stone_id OR s.slug = f.stone_id
     WHERE f.user_id = $1
     ORDER BY f.created_at DESC`,
    [session.user.id]
  )

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

  try {
    const result = await run(
      `INSERT INTO favorites (user_id, stone_id, stone_name, stone_image, stone_material, stone_price_range)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, stone_id) DO NOTHING`,
      [session.user.id, stone_id, stone_name, stone_image, stone_material, stone_price_range]
    )

    return NextResponse.json({ added: (result.rowCount ?? 0) > 0 })
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

  const result = await run(
    'DELETE FROM favorites WHERE user_id = $1 AND stone_id = $2',
    [session.user.id, stone_id]
  )

  return NextResponse.json({ removed: (result.rowCount ?? 0) > 0 })
}

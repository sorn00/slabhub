import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const rows = await query(`
      SELECT qr.id, qr.stone_id, qr.stone_name, qr.customer_name, qr.phone, qr.sqft_estimate,
             qr.notes, qr.status, qr.created_at, qr.stones, u.email as user_email
      FROM quote_requests qr
      LEFT JOIN users u ON u.id = qr.user_id
      ORDER BY qr.created_at ASC
    `)

    return NextResponse.json(rows.map(row => {
      const stones = typeof row.stones === 'string' ? JSON.parse(row.stones) : row.stones
      const selectedStones = Array.isArray(stones)
        ? stones.map((stone: { stoneName?: string; stoneId?: string }) => stone.stoneName || stone.stoneId).filter(Boolean)
        : [row.stone_name || row.stone_id].filter(Boolean)

      return {
        id: row.id,
        name: row.customer_name,
        email: row.user_email,
        selectedStones,
        createdAt: row.created_at,
      }
    }))
  } catch {
    return NextResponse.json([])
  }
}

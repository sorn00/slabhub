import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db-postgres'

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })

  try {
    const pool = getPool()

    const result = await pool.query(
      `SELECT city_slug, city_name, state, status, leads_last_30d, partner_name
       FROM partner_markets WHERE city_slug = $1`,
      [slug]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ market: null, nearby: [] })
    }

    const market = result.rows[0]

    // Nearby: same state, available, exclude current
    const nearby = await pool.query(
      `SELECT city_slug, city_name, state, status, leads_last_30d
       FROM partner_markets
       WHERE state = $1 AND city_slug != $2 AND status = 'available'
       ORDER BY RANDOM()
       LIMIT 3`,
      [market.state, slug]
    )

    return NextResponse.json({ market, nearby: nearby.rows })
  } catch (err) {
    console.error('Error fetching market:', err)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}

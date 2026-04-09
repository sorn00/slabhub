import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db-postgres'

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type')
  const pool = getPool()

  if (type === 'applications') {
    const result = await pool.query(`
      SELECT a.*, m.city_name, m.state, m.status AS market_status
      FROM partner_applications a
      LEFT JOIN partner_markets m ON m.city_slug = a.city_slug
      ORDER BY a.created_at DESC
    `)
    return NextResponse.json({ applications: result.rows })
  }

  if (type === 'markets') {
    const result = await pool.query(
      `SELECT * FROM partner_markets ORDER BY state, city_name`
    )
    return NextResponse.json({ markets: result.rows })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action } = body
  const pool = getPool()

  if (action === 'approve') {
    const { appId, citySlug, partnerName } = body

    // Mark application approved
    await pool.query(
      `UPDATE partner_applications SET status = 'approved' WHERE id = $1`,
      [appId]
    )

    // Mark market as claimed
    await pool.query(
      `UPDATE partner_markets
       SET status = 'claimed', partner_name = $1, claimed_at = NOW()
       WHERE city_slug = $2`,
      [partnerName, citySlug]
    )

    return NextResponse.json({ ok: true })
  }

  if (action === 'reject') {
    const { appId } = body
    await pool.query(
      `UPDATE partner_applications SET status = 'rejected' WHERE id = $1`,
      [appId]
    )
    return NextResponse.json({ ok: true })
  }

  if (action === 'reopen') {
    const { citySlug } = body
    await pool.query(
      `UPDATE partner_markets
       SET status = 'available', partner_name = NULL, partner_id = NULL, claimed_at = NULL
       WHERE city_slug = $1`,
      [citySlug]
    )
    return NextResponse.json({ ok: true })
  }

  if (action === 'update-leads') {
    const { citySlug, leads } = body
    await pool.query(
      `UPDATE partner_markets SET leads_last_30d = $1 WHERE city_slug = $2`,
      [leads, citySlug]
    )
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
}

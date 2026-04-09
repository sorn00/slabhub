import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db-postgres'

export async function POST(req: NextRequest) {
  try {
    const { citySlug, email, name } = await req.json()
    if (!citySlug || !email) {
      return NextResponse.json({ ok: false, error: 'Missing fields' }, { status: 400 })
    }

    const pool = getPool()

    // Save as pending application with waitlist status
    await pool.query(
      `INSERT INTO partner_applications (city_slug, company_name, contact_name, phone, email, status)
       VALUES ($1, $2, $3, '', $4, 'waitlist')
       ON CONFLICT DO NOTHING`,
      [citySlug, name || 'Waitlist', name || 'Waitlist', email]
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Waitlist error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

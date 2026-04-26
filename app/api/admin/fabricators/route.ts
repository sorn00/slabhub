import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const rows = await query(`
      SELECT id, business_name, owner_name, phone, email, city, state, zip, radius, customer_id, status, created_at
      FROM fabricator_registrations
      ORDER BY created_at DESC
    `)

    return NextResponse.json(rows.map(row => ({
      id: row.id,
      businessName: row.business_name,
      ownerName: row.owner_name,
      phone: row.phone,
      email: row.email,
      state: row.state,
      coverage: row.radius,
      customerId: row.customer_id,
      status: row.status,
      createdAt: row.created_at,
    })))
  } catch {
    return NextResponse.json([])
  }
}

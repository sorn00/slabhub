import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { stone_id, stone_name, customer_name, phone, sqft_estimate, notes } = await req.json()
  if (!stone_id || !customer_name || !phone) {
    return NextResponse.json({ error: 'stone_id, customer_name, and phone are required' }, { status: 400 })
  }

  const db = getDb()
  const result = db.prepare(
    `INSERT INTO quote_requests (user_id, stone_id, stone_name, customer_name, phone, sqft_estimate, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(session.user.id, stone_id, stone_name, customer_name, phone, sqft_estimate, notes)

  return NextResponse.json({ id: result.lastInsertRowid })
}

export async function GET(req: NextRequest) {
  // Check for admin cookie first
  const adminSession = req.cookies.get('admin_session')
  if (adminSession?.value === 'valid') {
    const db = getDb()
    const requests = db.prepare(`
      SELECT qr.*, u.name as user_name, u.email as user_email,
             qf.filename as quote_file, qf.original_name as quote_file_name,
             qf.uploaded_at as quote_file_uploaded_at
      FROM quote_requests qr
      JOIN users u ON u.id = qr.user_id
      LEFT JOIN quote_files qf ON qf.quote_request_id = qr.id
      ORDER BY qr.created_at DESC
    `).all()
    return NextResponse.json(requests)
  }

  // Otherwise require customer NextAuth session
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getDb()
  const requests = db.prepare(`
    SELECT qr.*,
           qf.filename as quote_file, qf.original_name as quote_file_name,
           qf.uploaded_at as quote_file_uploaded_at
    FROM quote_requests qr
    LEFT JOIN quote_files qf ON qf.quote_request_id = qr.id
    WHERE qr.user_id = ?
    ORDER BY qr.created_at DESC
  `).all(session.user.id)

  return NextResponse.json(requests)
}

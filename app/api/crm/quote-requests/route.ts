import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET(req: NextRequest) {
  // Require admin session (cookie) or logged-in user with admin role
  const adminSession = req.cookies.get('admin_session')
  if (adminSession?.value !== 'valid') {
    const session = await auth()
    const role = (session?.user as { role?: string })?.role
    if (!session || role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const requests = await query(`
    SELECT qr.*,
           u.name as user_name, u.email as user_email,
           qf.filename as quote_file, qf.original_name as quote_file_name,
           qf.uploaded_at as quote_file_uploaded_at
    FROM quote_requests qr
    JOIN users u ON u.id = qr.user_id
    LEFT JOIN quote_files qf ON qf.quote_request_id = qr.id
    ORDER BY qr.created_at DESC
  `)

  return NextResponse.json(requests.map(r => ({
    ...r,
    stones: typeof r.stones === 'string' ? JSON.parse(r.stones) : (r.stones ?? null),
  })))
}

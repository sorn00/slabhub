import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { query } from '@/lib/db'
import CrmQuotesClient from './CrmQuotesClient'

export default async function CrmQuotesPage() {
  const session = await auth()
  if (!session) {
    redirect('/login')
  }

  const userRole = (session.user as { role?: string }).role || 'reviewer'
  if (userRole !== 'admin') {
    redirect('/crm')
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

  const parsed = requests.map(r => ({
    ...r,
    stones: typeof r.stones === 'string' ? JSON.parse(r.stones) : (r.stones ?? null),
  }))

  return <CrmQuotesClient initialRequests={parsed} />
}

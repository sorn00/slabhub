import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { getStageCounts } from '@/lib/ghl-db'
import CrmDashboardClient from './CrmDashboardClient'

export default async function CrmPage() {
  const session = await auth()
  if (!session) {
    redirect('/login')
  }

  const db = getDb()

  // Stats
  const pending = (db.prepare("SELECT COUNT(*) as count FROM staged_messages WHERE status = 'pending'").get() as { count: number }).count
  const approvedToday = (db.prepare("SELECT COUNT(*) as count FROM staged_messages WHERE status IN ('approved','sent') AND DATE(reviewed_at) = DATE('now')").get() as { count: number }).count
  const sentToday = (db.prepare("SELECT COUNT(*) as count FROM staged_messages WHERE status = 'sent' AND DATE(sent_at) = DATE('now')").get() as { count: number }).count

  // Staged messages (pending first, then others)
  const stagedMessages = db.prepare(`
    SELECT * FROM staged_messages
    ORDER BY
      CASE status
        WHEN 'pending' THEN 0
        WHEN 'edited' THEN 1
        WHEN 'approved' THEN 2
        WHEN 'sent' THEN 3
        WHEN 'rejected' THEN 4
        ELSE 5
      END,
      created_at ASC
  `).all()

  let stageCounts: Record<string, number> = {}
  try {
    stageCounts = getStageCounts()
  } catch {
    // GHL DB might not exist yet
  }

  const userRole = (session.user as { role?: string }).role || 'reviewer'

  return (
    <CrmDashboardClient
      stats={{ pending, approvedToday, sentToday }}
      stagedMessages={stagedMessages as Parameters<typeof CrmDashboardClient>[0]['stagedMessages']}
      stageCounts={stageCounts}
      isAdmin={userRole === 'admin'}
      userName={session.user?.name || ''}
    />
  )
}

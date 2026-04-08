import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'
import { getStageCounts } from '@/lib/ghl-db'
import MessagesClient from './MessagesClient'

export default async function MessagesPage() {
  const session = await auth()
  if (!session) {
    redirect('/login')
  }

  // Stats
  const pendingRow = await queryOne("SELECT COUNT(*) as count FROM staged_messages WHERE status = 'pending'")
  const pending = parseInt(pendingRow?.count ?? '0', 10)

  const approvedTodayRow = await queryOne("SELECT COUNT(*) as count FROM staged_messages WHERE status IN ('approved','sent') AND DATE(reviewed_at) = CURRENT_DATE")
  const approvedToday = parseInt(approvedTodayRow?.count ?? '0', 10)

  const sentTodayRow = await queryOne("SELECT COUNT(*) as count FROM staged_messages WHERE status = 'sent' AND DATE(sent_at) = CURRENT_DATE")
  const sentToday = parseInt(sentTodayRow?.count ?? '0', 10)

  // Staged messages
  const stagedMessages = await query(`
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
  `)

  let stageCounts: Record<string, number> = {}
  try {
    stageCounts = getStageCounts()
  } catch {
    // GHL DB might not exist yet
  }

  const userRole = (session.user as { role?: string }).role || 'reviewer'

  return (
    <MessagesClient
      stats={{ pending, approvedToday, sentToday }}
      stagedMessages={stagedMessages as Parameters<typeof MessagesClient>[0]['stagedMessages']}
      stageCounts={stageCounts}
      isAdmin={userRole === 'admin'}
      userName={session.user?.name || ''}
    />
  )
}

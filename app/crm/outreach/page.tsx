import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { query } from '@/lib/db'
import OutreachClient from './OutreachClient'

export default async function OutreachPage() {
  const session = await auth()
  if (!session) {
    redirect('/login')
  }

  const queueItems = await query(`
    SELECT * FROM outreach_queue
    ORDER BY
      CASE status WHEN 'pending' THEN 0 ELSE 1 END,
      value DESC,
      created_at ASC
  `)

  return <OutreachClient initialQueue={queueItems} />
}

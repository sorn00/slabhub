import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { auth } from '@/lib/auth'
import { query } from '@/lib/db'
import OutreachClient from './OutreachClient'

export default async function OutreachPage() {
  const session = await auth()
  const isAdminCookie = cookies().get('admin_session')?.value === 'valid'
  if (!session && !isAdminCookie) redirect('/admin/login?redirect=/crm/outreach')

  // Pull outreach_queue (manual staged SMS from agents/Vicky)
  const queueItems = await query(`
    SELECT
      id::text            AS id,
      contact_name,
      phone,
      stage               AS stage_name,
      value,
      message,
      status,
      created_at,
      NULL::text          AS contact_id,
      NULL::text          AS conversation_id,
      NULL::text          AS context,
      'outreach_queue'    AS source
    FROM outreach_queue
    ORDER BY
      CASE status WHEN 'pending' THEN 0 ELSE 1 END,
      value DESC,
      created_at DESC
  `)

  // Pull staged_messages (AI-generated follow-up queue)
  const stagedItems = await query(`
    SELECT
      id                  AS id,
      contact_name,
      phone,
      stage_name,
      0                   AS value,
      message,
      status,
      created_at,
      contact_id,
      conversation_id,
      context,
      'staged_messages'   AS source
    FROM staged_messages
    WHERE stage_name IS NULL OR stage_name NOT LIKE 'quarriva_fabricator_%'
    ORDER BY
      CASE status WHEN 'pending' THEN 0 WHEN 'edited' THEN 1 ELSE 2 END,
      created_at DESC
  `)

  // Merge — outreach_queue first (priority), then staged_messages
  const allItems = [...queueItems, ...stagedItems]

  return <OutreachClient initialQueue={allItems} />
}

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { auth } from '@/lib/auth'
import { query } from '@/lib/db'
import FabricatorOutreachClient from './FabricatorOutreachClient'

export default async function FabricatorOutreachPage() {
  const session = await auth()
  const isAdminCookie = cookies().get('admin_session')?.value === 'valid'
  if (!session && !isAdminCookie) redirect('/admin/login?redirect=/crm/fabricator-outreach')

  const rows = await query(`
    SELECT
      id,
      contact_id,
      contact_name,
      phone,
      conversation_id,
      message,
      status,
      stage_name,
      context,
      created_at,
      reviewed_at,
      sent_at,
      notes,
      COALESCE(channel, CASE WHEN stage_name = 'quarriva_fabricator_email' THEN 'Email' ELSE 'SMS' END) AS channel
    FROM staged_messages
    WHERE stage_name LIKE 'quarriva_fabricator_%'
    ORDER BY
      CASE status WHEN 'pending' THEN 0 WHEN 'edited' THEN 1 WHEN 'sent' THEN 2 ELSE 3 END,
      created_at DESC
  `)

  return <FabricatorOutreachClient initialItems={rows} />
}
